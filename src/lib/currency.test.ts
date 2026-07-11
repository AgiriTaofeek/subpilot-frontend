import { describe, expect, test } from "vitest";

import { formatNGN } from "#/lib/currency.ts";

describe("formatNGN", () => {
	test("formats kobo as naira with the \u20a6 symbol", () => {
		expect(formatNGN(125000)).toBe("\u20a61,250.00");
	});

	test("never rounds away a real kobo remainder", () => {
		// e.g. a \u20a65,000/mo plan prorated for 17 of 30 days: 500000 * 17/30
		expect(formatNGN(283333)).toBe("\u20a62,833.33");
		expect(formatNGN(149)).toBe("\u20a61.49");
		expect(formatNGN(150)).toBe("\u20a61.50");
	});

	test("falls back to a placeholder instead of rendering NaN for a malformed amount", () => {
		expect(formatNGN(Number.NaN)).toBe("\u2014");
		expect(formatNGN(undefined as unknown as number)).toBe("\u2014");
		expect(formatNGN(null as unknown as number)).toBe("\u2014");
		expect(formatNGN(Number.POSITIVE_INFINITY)).toBe("\u2014");
	});
});
