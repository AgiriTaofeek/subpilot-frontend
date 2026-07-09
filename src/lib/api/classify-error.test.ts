import { describe, expect, test } from "vitest";

import { classifyError } from "#/lib/api/classify-error.ts";

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
