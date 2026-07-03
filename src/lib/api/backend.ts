import { createServerOnlyFn } from "@tanstack/react-start";
import type { BackendErrorShape } from "#/types/api.ts";

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";
const MUTATING_METHODS = new Set(["DELETE", "PATCH", "POST"]);
const CSRF_COOKIE_NAME = "_subpilot_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const NON_REFRESHABLE_PATHS = new Set([
	"/v1/auth/login",
	"/v1/auth/logout",
	"/v1/auth/refresh",
	"/v1/auth/signup",
]);

// response.statusText is unreliable across runtimes (empty under Node's
// undici in some environments even for real error responses), so fall
// back to a deterministic map for the codes callers branch on instead of
// trusting the platform-provided text.
const STATUS_FALLBACK_MESSAGE: Record<number, string> = {
	401: "Unauthorized",
	403: "Forbidden",
};
const UNAUTHENTICATED_STATUSES = new Set([401, 403]);

export class BackendApiError extends Error {
	status: number;
	code?: string;

	constructor(input: { message: string; status: number; code?: string }) {
		super(input.message);
		this.name = "BackendApiError";
		this.status = input.status;
		this.code = input.code;
	}
}

export function isUnauthenticatedStatus(status: number) {
	return UNAUTHENTICATED_STATUSES.has(status);
}

export function isUnauthenticatedBackendError(
	error: unknown,
): error is BackendApiError {
	return (
		error instanceof BackendApiError && isUnauthenticatedStatus(error.status)
	);
}

function getApiBaseUrl() {
	const baseUrl = process.env.VITE_API_BASE_URL?.trim();

	if (!baseUrl) {
		throw new Error("VITE_API_BASE_URL is not configured.");
	}

	return baseUrl.replace(/\/+$/, "");
}

function buildUrl(
	path: string,
	search?: Record<string, number | string | null | undefined>,
) {
	const url = new URL(`${getApiBaseUrl()}${path}`);

	if (search) {
		for (const [key, value] of Object.entries(search)) {
			if (value === undefined || value === null || value === "") continue;
			url.searchParams.set(key, String(value));
		}
	}

	return url;
}

async function parseBackendError(response: Response) {
	let payload: BackendErrorShape | null = null;

	try {
		payload = (await response.json()) as BackendErrorShape;
	} catch {
		payload = null;
	}

	const message =
		payload?.error?.message ||
		STATUS_FALLBACK_MESSAGE[response.status] ||
		response.statusText ||
		DEFAULT_ERROR_MESSAGE;

	return new BackendApiError({
		message,
		status: response.status,
		code: payload?.error?.code,
	});
}

async function parseJsonResponse<T>(response: Response) {
	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}

function readCookieValue(
	cookieHeader: string | null | undefined,
	name: string,
) {
	if (!cookieHeader) return null;

	for (const part of cookieHeader.split(";")) {
		const [rawName, ...rawValue] = part.trim().split("=");
		if (rawName === name) {
			return rawValue.join("=");
		}
	}

	return null;
}

function mergeCookieHeader(
	currentCookieHeader: string | null | undefined,
	setCookies: string[],
) {
	const cookies = new Map<string, string>();

	if (currentCookieHeader) {
		for (const part of currentCookieHeader.split(";")) {
			const [rawName, ...rawValue] = part.trim().split("=");
			if (!rawName || rawValue.length === 0) continue;
			cookies.set(rawName, rawValue.join("="));
		}
	}

	for (const setCookie of setCookies) {
		const [cookiePair] = setCookie.split(";", 1);
		const [rawName, ...rawValue] = cookiePair.trim().split("=");
		if (!rawName || rawValue.length === 0) continue;
		cookies.set(rawName, rawValue.join("="));
	}

	return Array.from(cookies.entries())
		.map(([name, value]) => `${name}=${value}`)
		.join("; ");
}

function getResponseSetCookies(response: Response) {
	const headers = response.headers as Headers & {
		getSetCookie?: () => string[];
	};

	if (typeof headers.getSetCookie === "function") {
		return headers.getSetCookie();
	}

	const setCookie = response.headers.get("set-cookie");
	return setCookie ? [setCookie] : [];
}

async function forwardResponseCookies(
	response: Response,
	serverHeaders: typeof import("@tanstack/react-start/server"),
) {
	// setResponseHeader("set-cookie", value) calls Headers.set() for a
	// single string, which REPLACES any existing set-cookie header rather
	// than adding another. Looping it per-cookie meant only the last
	// cookie in the response (and only the last across every call to this
	// function within one request, e.g. the auth-refresh retry path)
	// actually reached the browser — signup/login responses set session +
	// refresh + csrf cookies, and all but one were silently dropped.
	// Headers.append() is the correct primitive for repeatable headers
	// like Set-Cookie: it always adds, never clears what's already there.
	const headers = serverHeaders.getResponseHeaders();
	for (const cookie of getResponseSetCookies(response)) {
		headers.append("set-cookie", cookie);
	}
}

function attachCsrfHeader(
	headers: Headers,
	method: "DELETE" | "GET" | "PATCH" | "POST",
	cookieHeader: string | null | undefined,
) {
	if (!MUTATING_METHODS.has(method)) return;

	const csrfToken = readCookieValue(cookieHeader, CSRF_COOKIE_NAME);
	if (csrfToken) {
		headers.set(CSRF_HEADER_NAME, csrfToken);
	}
}

async function makeBackendFetch(
	input: {
		path: string;
		method: "DELETE" | "GET" | "PATCH" | "POST";
		search?: Record<string, number | string | null | undefined>;
		body?: unknown;
	},
	headers: Headers,
) {
	return fetch(buildUrl(input.path, input.search), {
		method: input.method,
		headers,
		body: input.body === undefined ? undefined : JSON.stringify(input.body),
	});
}

async function refreshMerchantSession(
	cookieHeader: string | null | undefined,
	serverHeaders: typeof import("@tanstack/react-start/server"),
) {
	if (!cookieHeader) return null;

	const refreshHeaders = new Headers({
		cookie: cookieHeader,
	});

	const refreshResponse = await fetch(buildUrl("/v1/auth/refresh"), {
		method: "POST",
		headers: refreshHeaders,
	});

	await forwardResponseCookies(refreshResponse, serverHeaders);

	if (!refreshResponse.ok) {
		if (isUnauthenticatedStatus(refreshResponse.status)) {
			serverHeaders.setResponseStatus(refreshResponse.status);
			return null;
		}

		throw await parseBackendError(refreshResponse);
	}

	return mergeCookieHeader(
		cookieHeader,
		getResponseSetCookies(refreshResponse),
	);
}

// backendRequest is a plain shared helper, not itself a createServerFn — it's
// only ever called from inside createServerFn().handler(...) bodies. But
// since it's imported into files that also get pulled into client-reachable
// route modules (e.g. routes/auth.tsx -> lib/api/auth.ts -> here), its
// dynamic `import("@tanstack/react-start/server")` was flagged by Start's
// import-protection check as reachable from the client. createServerOnlyFn
// marks it so the compiler strips/guards it correctly, without changing this
// function's call signature at any of its call sites.
export const backendRequest = createServerOnlyFn(async function backendRequest<
	T,
>(input: {
	path: string;
	method?: "DELETE" | "GET" | "PATCH" | "POST";
	search?: Record<string, number | string | null | undefined>;
	body?: unknown;
	forwardCookies?: boolean;
}) {
	const method = input.method ?? "GET";
	const headers = new Headers();
	const serverHeaders = await import("@tanstack/react-start/server");
	const shouldForwardCookies = input.forwardCookies ?? true;
	const requestCookieHeader = shouldForwardCookies
		? serverHeaders.getRequestHeader("cookie")
		: null;

	if (input.body !== undefined) {
		headers.set("content-type", "application/json");
	}

	if (requestCookieHeader) {
		headers.set("cookie", requestCookieHeader);
	}

	attachCsrfHeader(headers, method, requestCookieHeader);

	let response = await makeBackendFetch(
		{
			path: input.path,
			method,
			search: input.search,
			body: input.body,
		},
		headers,
	);

	await forwardResponseCookies(response, serverHeaders);

	if (
		isUnauthenticatedStatus(response.status) &&
		shouldForwardCookies &&
		!NON_REFRESHABLE_PATHS.has(input.path)
	) {
		const refreshedCookieHeader = await refreshMerchantSession(
			requestCookieHeader,
			serverHeaders,
		);

		if (refreshedCookieHeader) {
			const retryHeaders = new Headers(headers);
			retryHeaders.set("cookie", refreshedCookieHeader);
			attachCsrfHeader(retryHeaders, method, refreshedCookieHeader);

			response = await makeBackendFetch(
				{
					path: input.path,
					method,
					search: input.search,
					body: input.body,
				},
				retryHeaders,
			);

			await forwardResponseCookies(response, serverHeaders);
		}
	}

	if (!response.ok) {
		if (isUnauthenticatedStatus(response.status)) {
			serverHeaders.setResponseStatus(response.status);
		}

		throw await parseBackendError(response);
	}

	return parseJsonResponse<T>(response);
});
