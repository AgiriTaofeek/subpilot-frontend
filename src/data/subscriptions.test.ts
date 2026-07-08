import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	formatRelativeBillingDate,
	subscriptionStatusLabel,
	subscriptionStatusTone,
	subscriptionTransitionLabels,
	subscriptionTransitions,
} from "#/data/subscriptions.ts";

// subscriptionTransitions is a deliberate mirror of the backend's
// SubscriptionStateMachine (see the comment on subscriptionTransitions
// itself) — TypeScript's Record<SubscriptionStatus, SubscriptionStatus[]>
// guarantees every status has an entry, but nothing at the type level keeps
// subscriptionTransitionLabels (a loose Record<string, string>) in sync with
// it. This is exactly the kind of drift the source comment warns about and
// the only thing actually guarding it before this test existed.
describe("subscription state-machine mirror", () => {
	test("every transition has exactly one matching label, and vice versa", () => {
		const edgesFromTransitions = new Set<string>();
		for (const [from, targets] of Object.entries(subscriptionTransitions)) {
			for (const to of targets) {
				edgesFromTransitions.add(`${from}->${to}`);
			}
		}

		const edgesFromLabels = new Set(Object.keys(subscriptionTransitionLabels));

		expect(edgesFromLabels).toEqual(edgesFromTransitions);
	});

	test("terminal statuses (cancelled, expired) have no outgoing transitions", () => {
		expect(subscriptionTransitions.cancelled).toEqual([]);
		expect(subscriptionTransitions.expired).toEqual([]);
	});

	test("past_due only reaches suspended, never directly to cancelled/expired", () => {
		expect(subscriptionTransitions.past_due).toEqual(["active", "suspended"]);
	});

	test("every status has both a tone and a label", () => {
		for (const status of Object.keys(subscriptionTransitions)) {
			expect(
				subscriptionStatusTone[status as keyof typeof subscriptionStatusTone],
			).toBeDefined();
			expect(
				subscriptionStatusLabel[status as keyof typeof subscriptionStatusLabel],
			).toBeDefined();
		}
	});
});

describe("formatRelativeBillingDate", () => {
	const now = new Date("2025-06-28T12:00:00Z");

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function daysFromNow(days: number): string {
		return new Date(now.getTime() + days * 24 * 60 * 60_000).toISOString();
	}

	test("returns an em dash for null", () => {
		expect(formatRelativeBillingDate(null)).toBe("—");
	});

	test("returns 'Today' for the current day", () => {
		expect(formatRelativeBillingDate(daysFromNow(0))).toBe("Today");
	});

	test("returns 'Tomorrow' for one day out", () => {
		expect(formatRelativeBillingDate(daysFromNow(1))).toBe("Tomorrow");
	});

	test("returns 'In N days' for 2-6 days out", () => {
		expect(formatRelativeBillingDate(daysFromNow(2))).toBe("In 2 days");
		expect(formatRelativeBillingDate(daysFromNow(6))).toBe("In 6 days");
	});

	test("falls back to a formatted date at 7+ days out", () => {
		expect(formatRelativeBillingDate(daysFromNow(7))).toBe("Jul 5, 2025");
	});

	test("falls back to a formatted date for overdue dates", () => {
		expect(formatRelativeBillingDate(daysFromNow(-3))).toBe("Jun 25, 2025");
	});
});
