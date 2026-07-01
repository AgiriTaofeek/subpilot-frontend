import type { BackendErrorShape } from "#/types/api.ts";

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

// response.statusText is unreliable across runtimes (empty under Node's
// undici in some environments even for real error responses), so fall
// back to a deterministic map for the codes callers branch on instead of
// trusting the platform-provided text.
const STATUS_FALLBACK_MESSAGE: Record<number, string> = {
	401: "Unauthorized",
	403: "Forbidden",
};

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

export async function backendRequest<T>(input: {
	path: string;
	method?: "DELETE" | "GET" | "PATCH" | "POST";
	search?: Record<string, number | string | null | undefined>;
	body?: unknown;
	forwardCookies?: boolean;
}) {
	const headers = new Headers();
	const serverHeaders = await import("@tanstack/react-start/server");

	if (input.body !== undefined) {
		headers.set("content-type", "application/json");
	}

	if (input.forwardCookies ?? true) {
		const cookie = serverHeaders.getRequestHeader("cookie");

		if (cookie) {
			headers.set("cookie", cookie);
		}
	}

	const response = await fetch(buildUrl(input.path, input.search), {
		method: input.method ?? "GET",
		headers,
		body: input.body === undefined ? undefined : JSON.stringify(input.body),
	});

	const setCookie = response.headers.get("set-cookie");

	if (setCookie) {
		serverHeaders.setResponseHeader("set-cookie", setCookie);
	}

	if (!response.ok) {
		if (response.status === 401) {
			serverHeaders.setResponseStatus(401);
		}

		throw await parseBackendError(response);
	}

	return parseJsonResponse<T>(response);
}
