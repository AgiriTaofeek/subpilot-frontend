import { describe, expect, test } from "vitest";

import { formatNGN } from "#/lib/currency.ts";

describe("formatNGN", () => {
	test("formats kobo as rounded naira with the \u20a6 symbol", () => {
		expect(formatNGN(125000)).toBe("\u20a61,250");
	});

	test("rounds fractional naira to the nearest whole amount", () => {
		expect(formatNGN(149)).toBe("\u20a61");
		expect(formatNGN(150)).toBe("\u20a62");
	});

	test("falls back to a placeholder instead of rendering NaN for a malformed amount", () => {
		expect(formatNGN(Number.NaN)).toBe("\u2014");
		expect(formatNGN(undefined as unknown as number)).toBe("\u2014");
		expect(formatNGN(null as unknown as number)).toBe("\u2014");
		expect(formatNGN(Number.POSITIVE_INFINITY)).toBe("\u2014");
	});
});
