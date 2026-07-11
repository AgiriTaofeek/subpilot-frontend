import { createServerOnlyFn } from "@tanstack/react-start";
import type { z } from "zod";
import {
	attachCsrfHeader,
	forwardResponseCookies,
	isUnauthenticatedStatus,
	makeBackendFetch,
	parseBackendError,
	parseJsonResponse,
	resolveSchemaResult,
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
		// Extra request headers beyond cookie/content-type/CSRF (all handled
		// below automatically) — e.g. X-Admin-Identity for refund
		// approve/reject's audit trail, which the backend has no other way to
		// learn since InternalAdminContext only carries the role check, not a
		// human-readable identity.
		headers?: Record<string, string>;
		// See backendRequest's identical option in backend.ts for why this
		// exists — same unchecked `as T` risk applies here.
		responseSchema?: z.ZodType<T>;
	}) {
		const method = input.method ?? "GET";
		const headers = new Headers(input.headers);
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

		const payload = await parseJsonResponse<unknown>(response);

		if (input.responseSchema) {
			return resolveSchemaResult(
				method,
				input.path,
				input.responseSchema.safeParse(payload),
				payload,
			);
		}

		return payload as T;
	},
);
