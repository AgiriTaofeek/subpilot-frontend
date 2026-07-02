export type ErrorCategory =
	| "auth_expired"
	| "not_found"
	| "network"
	| "validation"
	| "server";

const AUTH_EXPIRED_PATTERN = /forbidden|unauthorized|permission/i;
const NOT_FOUND_PATTERN = /not found/i;
const NETWORK_PATTERN =
	/network|fetch failed|failed to fetch|econnrefused|enotfound|offline/i;
const VALIDATION_PATTERN =
	/validation|invalid|required|must be|cannot be blank/i;

/**
 * Classifies a backend/network failure into one of the categories the
 * frontend error/loading strategy defines. Operates on `error.message` only
 * — `BackendApiError`'s `status`/`code` fields don't survive the
 * `createServerFn` RPC boundary, so message-pattern matching is the only
 * signal available on the client. See docs/frontend-error-and-loading-strategy.md.
 *
 * "Forbidden" and "auth expired" are deliberately the same category here:
 * this backend's TenantContext-scoped queries return 404 for cross-tenant
 * access, not 403, so a real 403/401 only ever means a session/auth
 * problem in this app.
 */
export function classifyError(message: string): ErrorCategory {
	if (AUTH_EXPIRED_PATTERN.test(message)) return "auth_expired";
	if (NOT_FOUND_PATTERN.test(message)) return "not_found";
	if (NETWORK_PATTERN.test(message)) return "network";
	if (VALIDATION_PATTERN.test(message)) return "validation";
	return "server";
}

export const CATEGORY_COPY: Record<ErrorCategory, string> = {
	auth_expired: "Your session expired. Please sign in again.",
	not_found: "We couldn't find that.",
	network: "Couldn't reach the server. Check your connection and try again.",
	validation: "That didn't go through. Check the details and try again.",
	server: "Something went wrong on our end. Please try again.",
};
