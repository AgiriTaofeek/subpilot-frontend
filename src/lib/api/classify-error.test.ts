import { describe, expect, test } from "vitest";

import { encodeBackendErrorEnvelope } from "#/lib/api/backend-error-envelope.ts";
import {
	classifyError,
	getBackendErrorDetails,
} from "#/lib/api/classify-error.ts";

describe("classifyError", () => {
	test("classifies auth/permission failures", () => {
		expect(classifyError("Forbidden")).toBe("auth_expired");
		expect(classifyError("Unauthorized")).toBe("auth_expired");
	});

	test("classifies not-found messages", () => {
		expect(classifyError("plan not found")).toBe("not_found");
	});

	test("classifies network failures", () => {
		expect(classifyError("Failed to fetch")).toBe("network");
	});

	test("classifies backend field-validation messages", () => {
		expect(classifyError("Email is required")).toBe("validation");
		expect(
			classifyError("Full name must be between 2 and 100 characters"),
		).toBe("validation");
	});

	// backendRequest's responseSchema mismatch message (backend.ts) is a pure
	// contract bug between this app and the Java backend — the customer did
	// nothing wrong. It must fall through to "server", not get swept up by
	// VALIDATION_PATTERN just because zod's own wording says "Invalid ...".
	test("classifies a backend response shape mismatch as a server error, not validation", () => {
		const message =
			"The server sent back something this page didn't expect for /v1/public/plans/acme/pro/checkout. Please try again.";
		expect(classifyError(message)).toBe("server");
	});

	test("falls back to server for anything unrecognized", () => {
		expect(classifyError("boom")).toBe("server");
	});
});

describe("classifyError with an envelope", () => {
	test("maps 401/403 to auth_expired regardless of wording", () => {
		const message = encodeBackendErrorEnvelope({
			status: 403,
			displayMessage: "You do not have access to this resource",
		});
		expect(classifyError(message)).toBe("auth_expired");
	});

	test("maps 404 to not_found", () => {
		const message = encodeBackendErrorEnvelope({
			status: 404,
			displayMessage: "plan not found",
		});
		expect(classifyError(message)).toBe("not_found");
	});

	test("maps any 5xx to server without pattern-matching, e.g. a raw 502", () => {
		const message = encodeBackendErrorEnvelope({
			status: 502,
			displayMessage: "Bad Gateway",
		});
		expect(classifyError(message)).toBe("server");
	});

	test("respects an explicit category override for schema-mismatch errors", () => {
		const message = encodeBackendErrorEnvelope({
			status: 200,
			category: "server",
			displayMessage:
				"The server sent back something this page didn't expect for /v1/public/plans/acme/pro/checkout. Please try again.",
		});
		expect(classifyError(message)).toBe("server");
	});

	test("falls back to plain-text classification for a legacy, non-enveloped message", () => {
		expect(classifyError("Failed to fetch")).toBe("network");
	});
});

describe("getBackendErrorDetails", () => {
	test("surfaces requestId and displayMessage separately from the raw message", () => {
		const message = encodeBackendErrorEnvelope({
			status: 500,
			requestId: "req_123",
			displayMessage: "Something went wrong on our end. Please try again.",
		});
		const details = getBackendErrorDetails(message);
		expect(details.category).toBe("server");
		expect(details.displayMessage).toBe(
			"Something went wrong on our end. Please try again.",
		);
		expect(details.requestId).toBe("req_123");
	});

	test("falls back gracefully for a plain string", () => {
		const details = getBackendErrorDetails("boom");
		expect(details.category).toBe("server");
		expect(details.displayMessage).toBe("boom");
		expect(details.requestId).toBeUndefined();
	});
});
