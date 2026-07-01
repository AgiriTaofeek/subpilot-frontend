import { plans } from "#/data/plans.ts";

export type SubscriptionStatus =
	| "trialing"
	| "active"
	| "past_due"
	| "paused"
	| "cancelled"
	| "expired";

export interface Subscription {
	id: string;
	customerName: string;
	customerEmail: string;
	planId: string;
	status: SubscriptionStatus;
	amountKobo: number;
	nextBillingDate: string | null;
	currentPeriodEnd: string;
	nextRetryAt?: string | null;
	cancelAtPeriodEnd?: boolean;
	updatedAt: string;
	createdAt: string;
}

export const subscriptionStatusTone: Record<
	SubscriptionStatus,
	"brand" | "success" | "warning" | "neutral"
> = {
	trialing: "brand",
	active: "success",
	past_due: "warning",
	paused: "neutral",
	cancelled: "neutral",
	expired: "neutral",
};

export const subscriptionStatusLabel: Record<SubscriptionStatus, string> = {
	trialing: "Trialing",
	active: "Active",
	past_due: "Past due",
	paused: "Paused",
	cancelled: "Cancelled",
	expired: "Expired",
};

function amountFor(planId: string): number {
	return plans.find((p) => p.id === planId)?.amountKobo ?? 0;
}

export function planNameFor(planId: string): string {
	return plans.find((p) => p.id === planId)?.name ?? "Unknown plan";
}

export function formatRelativeBillingDate(iso: string | null): string {
	if (!iso) return "—";
	const target = new Date(iso);
	const now = new Date();
	const diffDays = Math.round(
		(target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
	);

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Tomorrow";
	if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
	return target.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export const subscriptions: Subscription[] = [
	{
		id: "sub_01",
		customerName: "Ada Eze",
		customerEmail: "ada.eze@example.com",
		planId: "plan_01",
		status: "active",
		amountKobo: amountFor("plan_01"),
		nextBillingDate: "2026-07-02T09:00:00.000Z",
		currentPeriodEnd: "2026-07-02T09:00:00.000Z",
		updatedAt: "2026-06-25T10:00:00.000Z",
		createdAt: "2026-01-15T09:00:00.000Z",
	},
	{
		id: "sub_02",
		customerName: "Femi Adekunle",
		customerEmail: "femi.adekunle@example.com",
		planId: "plan_02",
		status: "past_due",
		amountKobo: amountFor("plan_02"),
		nextBillingDate: "2026-06-28T09:00:00.000Z",
		currentPeriodEnd: "2026-06-28T09:00:00.000Z",
		nextRetryAt: "2026-07-03T09:00:00.000Z",
		updatedAt: "2026-06-29T14:20:00.000Z",
		createdAt: "2026-02-02T09:00:00.000Z",
	},
	{
		id: "sub_03",
		customerName: "Ngozi Okafor",
		customerEmail: "ngozi.okafor@example.com",
		planId: "plan_07",
		status: "active",
		amountKobo: amountFor("plan_07"),
		nextBillingDate: "2026-07-15T09:00:00.000Z",
		currentPeriodEnd: "2026-07-15T09:00:00.000Z",
		updatedAt: "2026-06-15T09:00:00.000Z",
		createdAt: "2026-03-10T09:00:00.000Z",
	},
	{
		id: "sub_04",
		customerName: "Tunde Bakare",
		customerEmail: "tunde.bakare@example.com",
		planId: "plan_09",
		status: "trialing",
		amountKobo: amountFor("plan_09"),
		nextBillingDate: "2026-07-05T09:00:00.000Z",
		currentPeriodEnd: "2026-07-05T09:00:00.000Z",
		updatedAt: "2026-06-28T09:00:00.000Z",
		createdAt: "2026-06-21T09:00:00.000Z",
	},
	{
		id: "sub_05",
		customerName: "Blessing Okoro",
		customerEmail: "blessing.okoro@example.com",
		planId: "plan_01",
		status: "past_due",
		amountKobo: amountFor("plan_01"),
		nextBillingDate: "2026-06-30T09:00:00.000Z",
		currentPeriodEnd: "2026-06-30T09:00:00.000Z",
		nextRetryAt: "2026-07-02T09:00:00.000Z",
		updatedAt: "2026-06-30T16:40:00.000Z",
		createdAt: "2026-01-28T09:00:00.000Z",
	},
	{
		id: "sub_06",
		customerName: "Chidi Nwosu",
		customerEmail: "chidi.nwosu@example.com",
		planId: "plan_11",
		status: "active",
		amountKobo: amountFor("plan_11"),
		nextBillingDate: "2026-07-01T09:00:00.000Z",
		currentPeriodEnd: "2026-07-01T09:00:00.000Z",
		updatedAt: "2026-06-01T09:00:00.000Z",
		createdAt: "2025-12-01T09:00:00.000Z",
	},
	{
		id: "sub_07",
		customerName: "Amaka Obi",
		customerEmail: "amaka.obi@example.com",
		planId: "plan_03",
		status: "active",
		amountKobo: amountFor("plan_03"),
		nextBillingDate: "2026-09-01T09:00:00.000Z",
		currentPeriodEnd: "2026-09-01T09:00:00.000Z",
		updatedAt: "2026-05-28T09:00:00.000Z",
		createdAt: "2025-09-01T09:00:00.000Z",
	},
	{
		id: "sub_08",
		customerName: "Ibrahim Sule",
		customerEmail: "ibrahim.sule@example.com",
		planId: "plan_08",
		status: "paused",
		amountKobo: amountFor("plan_08"),
		nextBillingDate: null,
		currentPeriodEnd: "2026-08-19T09:00:00.000Z",
		updatedAt: "2026-06-19T09:00:00.000Z",
		createdAt: "2025-06-19T09:00:00.000Z",
	},
	{
		id: "sub_09",
		customerName: "Grace Umeh",
		customerEmail: "grace.umeh@example.com",
		planId: "plan_02",
		status: "cancelled",
		amountKobo: amountFor("plan_02"),
		nextBillingDate: null,
		currentPeriodEnd: "2026-06-10T09:00:00.000Z",
		updatedAt: "2026-06-10T09:00:00.000Z",
		createdAt: "2025-11-10T09:00:00.000Z",
	},
	{
		id: "sub_10",
		customerName: "Emeka Chukwu",
		customerEmail: "emeka.chukwu@example.com",
		planId: "plan_07",
		status: "expired",
		amountKobo: amountFor("plan_07"),
		nextBillingDate: null,
		currentPeriodEnd: "2026-05-20T09:00:00.000Z",
		updatedAt: "2026-05-20T09:00:00.000Z",
		createdAt: "2025-08-20T09:00:00.000Z",
	},
	{
		id: "sub_11",
		customerName: "Fatima Bello",
		customerEmail: "fatima.bello@example.com",
		planId: "plan_01",
		status: "active",
		amountKobo: amountFor("plan_01"),
		nextBillingDate: "2026-07-04T09:00:00.000Z",
		currentPeriodEnd: "2026-07-04T09:00:00.000Z",
		updatedAt: "2026-06-04T09:00:00.000Z",
		createdAt: "2026-04-04T09:00:00.000Z",
	},
	{
		id: "sub_12",
		customerName: "Segun Afolabi",
		customerEmail: "segun.afolabi@example.com",
		planId: "plan_09",
		status: "trialing",
		amountKobo: amountFor("plan_09"),
		nextBillingDate: "2026-07-06T09:00:00.000Z",
		currentPeriodEnd: "2026-07-06T09:00:00.000Z",
		updatedAt: "2026-06-29T09:00:00.000Z",
		createdAt: "2026-06-22T09:00:00.000Z",
	},
	{
		id: "sub_13",
		customerName: "Uche Eze",
		customerEmail: "uche.eze@example.com",
		planId: "plan_11",
		status: "past_due",
		amountKobo: amountFor("plan_11"),
		nextBillingDate: "2026-06-29T09:00:00.000Z",
		currentPeriodEnd: "2026-06-29T09:00:00.000Z",
		nextRetryAt: "2026-07-01T09:00:00.000Z",
		updatedAt: "2026-06-30T08:00:00.000Z",
		createdAt: "2026-01-29T09:00:00.000Z",
	},
	{
		id: "sub_14",
		customerName: "Kelechi Nwankwo",
		customerEmail: "kelechi.nwankwo@example.com",
		planId: "plan_02",
		status: "active",
		amountKobo: amountFor("plan_02"),
		nextBillingDate: "2026-07-20T09:00:00.000Z",
		currentPeriodEnd: "2026-07-20T09:00:00.000Z",
		cancelAtPeriodEnd: true,
		updatedAt: "2026-06-28T09:00:00.000Z",
		createdAt: "2026-03-01T09:00:00.000Z",
	},
	{
		id: "sub_15",
		customerName: "Yusuf Balogun",
		customerEmail: "yusuf.balogun@example.com",
		planId: "plan_09",
		status: "trialing",
		amountKobo: amountFor("plan_09"),
		nextBillingDate: "2026-07-06T09:00:00.000Z",
		currentPeriodEnd: "2026-07-06T09:00:00.000Z",
		updatedAt: "2026-06-29T09:00:00.000Z",
		createdAt: "2026-06-29T09:00:00.000Z",
	},
	{
		id: "sub_16",
		customerName: "Chiamaka Eze",
		customerEmail: "chiamaka.eze@example.com",
		planId: "plan_01",
		status: "active",
		amountKobo: amountFor("plan_01"),
		nextBillingDate: "2026-07-25T09:00:00.000Z",
		currentPeriodEnd: "2026-07-25T09:00:00.000Z",
		updatedAt: "2026-06-25T09:00:00.000Z",
		createdAt: "2026-06-25T09:00:00.000Z",
	},
];
