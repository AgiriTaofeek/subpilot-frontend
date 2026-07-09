// createServerFn only lets error.message (a plain string) survive
// serialization from server to browser — custom fields on a thrown Error
// subclass (status, code, ...) don't cross that RPC boundary. This module
// smuggles structured data through the one channel that does survive, by
// encoding it as a sentinel-prefixed JSON string. The prefix makes "is this
// an envelope" a cheap startsWith check before the defensive JSON.parse, so
// decoding never throws on a legacy/plain message (network errors, anything
// not yet migrated) — those just fall through as null.
const ENVELOPE_PREFIX = "SPBE1:";

export interface BackendErrorEnvelope {
	/** Real HTTP status from the backend response, when there is one. */
	status?: number;
	/** Java's error.code, when present. */
	code?: string;
	/** Java's error.request_id, for support/debugging correlation. */
	requestId?: string;
	/** The human-facing text — what error.message used to just be. */
	displayMessage: string;
	/**
	 * Explicit category override for throw sites that already know the
	 * right bucket and shouldn't rely on status/regex guessing (e.g. a
	 * response-shape mismatch, which is always "server" even though the
	 * HTTP response itself was 2xx). Typed as a bare string, not
	 * ErrorCategory, so this module has zero dependency on classify-error.ts.
	 */
	category?: string;
	/** Dev-only diagnostic detail (e.g. the raw zod diff). Never set in prod. */
	validationDetail?: string;
}

export function encodeBackendErrorEnvelope(
	envelope: BackendErrorEnvelope,
): string {
	return `${ENVELOPE_PREFIX}${JSON.stringify(envelope)}`;
}

export function decodeBackendErrorEnvelope(
	message: string,
): BackendErrorEnvelope | null {
	if (!message.startsWith(ENVELOPE_PREFIX)) return null;

	try {
		const parsed: unknown = JSON.parse(message.slice(ENVELOPE_PREFIX.length));
		if (
			parsed &&
			typeof parsed === "object" &&
			typeof (parsed as BackendErrorEnvelope).displayMessage === "string"
		) {
			return parsed as BackendErrorEnvelope;
		}
		return null;
	} catch {
		return null;
	}
}
