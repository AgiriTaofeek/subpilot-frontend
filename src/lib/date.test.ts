import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	formatChartDate,
	formatDate,
	formatDateLong,
	formatDateTime,
	formatRelativeTime,
} from "#/lib/date.ts";

// Pinned so date-boundary assertions don't depend on the host/CI machine's
// local timezone — every fixture below uses a midday UTC timestamp so it
// can't roll over to an adjacent calendar day once rendered in "en-US".
beforeEach(() => {
	process.env.TZ = "UTC";
});

describe("formatDate", () => {
	test("formats an ISO string as a short date", () => {
		expect(formatDate("2025-06-28T12:00:00Z")).toBe("Jun 28, 2025");
	});

	test("returns an em dash for null or undefined", () => {
		expect(formatDate(null)).toBe("—");
		expect(formatDate(undefined)).toBe("—");
	});
});

describe("formatDateTime", () => {
	test("formats an ISO string as a short date with time", () => {
		expect(formatDateTime("2025-06-28T14:30:00Z")).toBe(
			"Jun 28, 2025, 2:30 PM",
		);
	});

	test("returns an em dash for null or undefined", () => {
		expect(formatDateTime(null)).toBe("—");
		expect(formatDateTime(undefined)).toBe("—");
	});
});

describe("formatDateLong", () => {
	test("formats an ISO string with the full month name", () => {
		expect(formatDateLong("2025-06-28T12:00:00Z")).toBe("June 28, 2025");
	});
});

describe("formatChartDate", () => {
	test("formats an ISO string as a short month and day, no year", () => {
		expect(formatChartDate("2025-06-28T12:00:00Z")).toBe("Jun 28");
	});
});

describe("formatRelativeTime", () => {
	const now = new Date("2025-06-28T12:00:00Z");

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function minutesAgo(minutes: number): string {
		return new Date(now.getTime() - minutes * 60_000).toISOString();
	}

	function hoursAgo(hours: number): string {
		return new Date(now.getTime() - hours * 60 * 60_000).toISOString();
	}

	function daysAgo(days: number): string {
		return new Date(now.getTime() - days * 24 * 60 * 60_000).toISOString();
	}

	test("returns 'just now' for anything under a minute", () => {
		expect(formatRelativeTime(now.toISOString())).toBe("just now");
		expect(formatRelativeTime(minutesAgo(0.5))).toBe("just now");
	});

	test("pluralizes minutes correctly", () => {
		expect(formatRelativeTime(minutesAgo(1))).toBe("1 minute ago");
		expect(formatRelativeTime(minutesAgo(5))).toBe("5 minutes ago");
	});

	test("pluralizes hours correctly", () => {
		expect(formatRelativeTime(hoursAgo(1))).toBe("1 hour ago");
		expect(formatRelativeTime(hoursAgo(3))).toBe("3 hours ago");
	});

	test("pluralizes days correctly", () => {
		expect(formatRelativeTime(daysAgo(1))).toBe("1 day ago");
		expect(formatRelativeTime(daysAgo(2))).toBe("2 days ago");
	});
});
