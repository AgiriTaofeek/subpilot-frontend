import { createServerOnlyFn } from "@tanstack/react-start";
import {
	attachCsrfHeader,
	forwardResponseCookies,
	isUnauthenticatedStatus,
	makeBackendFetch,
	parseBackendError,
	parseJsonResponse,
} from "#/lib/api/backend.ts";

// Leaner sibling of backendRequest for the separate internal-admin auth
// surface: no refresh-retry loop, because InternalAuthController only has
// login/me/logout — a dead internal session just gets a 401/403 and the
// _internal.tsx route guard redirects to /internal/login, the same way a
// merchant session expiring mid-session does.
export const internalBackendRequest = createServerOnlyFn(
	async function internalBackendRequest<T>(input: {
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

		const response = await makeBackendFetch(
			{
				path: input.path,
				method,
				search: input.search,
				body: input.body,
			},
			headers,
		);

		await forwardResponseCookies(response, serverHeaders);

		if (!response.ok) {
			if (isUnauthenticatedStatus(response.status)) {
				serverHeaders.setResponseStatus(response.status);
			}

			throw await parseBackendError(response);
		}

		return parseJsonResponse<T>(response);
	},
);
