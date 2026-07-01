import { describe, expect, test } from "vitest";

import { formatNGN } from "#/lib/currency.ts";

describe("formatNGN", () => {
	test("formats kobo as rounded naira", () => {
		expect(formatNGN(125000)).toBe("NGN\u00a01,250");
	});

	test("rounds fractional naira to the nearest whole amount", () => {
		expect(formatNGN(149)).toBe("NGN\u00a01");
		expect(formatNGN(150)).toBe("NGN\u00a02");
	});
});
