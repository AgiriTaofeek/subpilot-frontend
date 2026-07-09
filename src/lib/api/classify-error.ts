import { decodeBackendErrorEnvelope } from "#/lib/api/backend-error-envelope.ts";

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

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set<ErrorCategory>([
	"auth_expired",
	"not_found",
	"network",
	"validation",
	"server",
]);

function classifyByPattern(message: string): ErrorCategory {
	if (AUTH_EXPIRED_PATTERN.test(message)) return "auth_expired";
	if (NOT_FOUND_PATTERN.test(message)) return "not_found";
	if (NETWORK_PATTERN.test(message)) return "network";
	if (VALIDATION_PATTERN.test(message)) return "validation";
	return "server";
}

/**
 * Classifies a backend/network failure into one of the categories the
 * frontend error/loading strategy defines. See
 * docs/frontend-error-and-loading-strategy.md.
 *
 * `BackendApiError`'s `status`/`code` fields don't survive the
 * `createServerFn` RPC boundary — backend.ts encodes them into `error.message`
 * as a structured envelope (backend-error-envelope.ts) instead. This decodes
 * that envelope first and branches on the real status/category when present,
 * falling back to message-pattern matching for anything that isn't an
 * envelope (network errors thrown by `fetch` itself never go through
 * backend.ts's error construction, so they never carry one).
 *
 * "Forbidden" and "auth expired" are deliberately the same category here:
 * this backend's TenantContext-scoped queries return 404 for cross-tenant
 * access, not 403, so a real 403/401 only ever means a session/auth
 * problem in this app.
 */
export function classifyError(message: string): ErrorCategory {
	const envelope = decodeBackendErrorEnvelope(message);
	if (!envelope) return classifyByPattern(message);

	if (envelope.category && KNOWN_CATEGORIES.has(envelope.category)) {
		return envelope.category as ErrorCategory;
	}

	if (envelope.status !== undefined) {
		if (envelope.status === 401 || envelope.status === 403) {
			return "auth_expired";
		}
		if (envelope.status === 404) return "not_found";
		// Deterministic: any real 5xx (including a gateway/proxy failure
		// surfaced as one) is always "server" — no need to pattern-match
		// Java's wording. This closes the exact bug class where a raw 502
		// matched none of the regexes and fell through unclassified.
		if (envelope.status >= 500) return "server";
	}

	// Remaining 4xx cases (400/409/422/...) have no confirmed Java
	// error-code taxonomy to branch on reliably, so fall back to the same
	// wording-based classification as before, applied to the clean
	// displayMessage instead of the raw envelope string.
	return classifyByPattern(envelope.displayMessage);
}

/**
 * Richer accessor for consumers that render error text directly (not just a
 * category), so they don't render the raw enveloped JSON string and don't
 * need to import/decode the envelope themselves.
 */
export function getBackendErrorDetails(message: string): {
	category: ErrorCategory;
	displayMessage: string;
	requestId?: string;
	validationDetail?: string;
} {
	const envelope = decodeBackendErrorEnvelope(message);
	if (!envelope) {
		return { category: classifyByPattern(message), displayMessage: message };
	}
	return {
		category: classifyError(message),
		displayMessage: envelope.displayMessage,
		requestId: envelope.requestId,
		validationDetail: envelope.validationDetail,
	};
}

export const CATEGORY_COPY: Record<ErrorCategory, string> = {
	auth_expired: "Your session expired. Please sign in again.",
	not_found: "We couldn't find that.",
	network: "Couldn't reach the server. Check your connection and try again.",
	validation: "That didn't go through. Check the details and try again.",
	server: "Something went wrong on our end. Please try again.",
};
