import { queryOptions } from "@tanstack/react-query";

import {
	archivePlan as archivePlanServerFn,
	createPlan as createPlanServerFn,
	getPlan as getPlanServerFn,
	getPublicPlan as getPublicPlanServerFn,
	initiateCheckout as initiateCheckoutServerFn,
	listPlans as listPlansServerFn,
	publishPlan as publishPlanServerFn,
	updatePlan as updatePlanServerFn,
} from "#/lib/api/plans.ts";
import type {
	BillingIntervalDto,
	PlanResponseDto,
	PublicPlanResponseDto,
} from "#/types/api.ts";

export type PlanStatus = "draft" | "published" | "archived";

export type ProrationPolicy = "none" | "credit" | "charge";

export type EditablePlanInterval =
	| { kind: "monthly" }
	| { kind: "annual" }
	| { kind: "weekly" }
	| { kind: "custom"; count: number; unit: "day" | "week" | "month" };

export type PlanInterval =
	| EditablePlanInterval
	| { kind: "daily" }
	| { kind: "quarterly" }
	| { kind: "custom_unknown"; label: string };

export interface Plan {
	id: string;
	name: string;
	description?: string;
	amountKobo: number;
	interval: PlanInterval;
	trialDays: number;
	proration: ProrationPolicy;
	status: PlanStatus;
	merchantSlug: string;
	planSlug: string;
	createdAt: string;
	hostedUrl?: string;
}

export interface PublicPlan {
	name: string;
	description?: string;
	amountKobo: number;
	interval: PlanInterval;
	trialDays: number;
	merchantName: string;
	merchantSlug: string;
	planSlug: string;
}

export const statusTone: Record<PlanStatus, "brand" | "neutral"> = {
	published: "brand",
	draft: "neutral",
	archived: "neutral",
};

export const prorationLabels: Record<ProrationPolicy, string> = {
	none: "None — no adjustment for mid-cycle changes.",
	credit: "Credit — unused days refunded to next invoice.",
	charge: "Charge — subscriber pays for remaining days immediately.",
};

export function formatInterval(interval: PlanInterval): string {
	switch (interval.kind) {
		case "daily":
			return "Daily";
		case "monthly":
			return "Monthly";
		case "annual":
			return "Yearly";
		case "quarterly":
			return "Quarterly";
		case "weekly":
			return "Weekly";
		case "custom": {
			const unit = interval.count === 1 ? interval.unit : `${interval.unit}s`;
			return `Every ${interval.count} ${unit}`;
		}
		case "custom_unknown":
			return interval.label;
	}
}

function normalizeHostedCheckoutTarget(
	hostedUrl: string | null | undefined,
	slug: string,
) {
	if (!hostedUrl) {
		return {
			merchantSlug: "merchant",
			planSlug: slug,
			hostedUrl: null,
		};
	}

	try {
		const url = new URL(hostedUrl, "https://subpilot.local");
		const segments = url.pathname.split("/").filter(Boolean);

		if (
			(segments[0] === "pay" || segments[0] === "plans") &&
			segments.length >= 3
		) {
			const merchantSlug = segments[1];
			const planSlug = segments[2];
			const normalizedPath = `/pay/${merchantSlug}/${planSlug}`;
			const normalizedUrl =
				url.origin === "https://subpilot.local"
					? normalizedPath
					: `${url.origin}${normalizedPath}`;

			return {
				merchantSlug,
				planSlug,
				hostedUrl: normalizedUrl,
			};
		}
	} catch {
		// Fallback to the frontend route shape when the backend host/url is malformed.
	}

	return {
		merchantSlug: "merchant",
		planSlug: slug,
		hostedUrl,
	};
}

function intervalFromBackend(
	billingInterval: BillingIntervalDto,
): PlanInterval {
	switch (billingInterval) {
		case "daily":
			return { kind: "daily" };
		case "weekly":
			return { kind: "weekly" };
		case "monthly":
			return { kind: "monthly" };
		case "quarterly":
			return { kind: "quarterly" };
		case "yearly":
			return { kind: "annual" };
		case "custom":
			return { kind: "custom_unknown", label: "Custom interval" };
	}
}

export function checkoutUrl(
	plan: Pick<Plan, "merchantSlug" | "planSlug"> & { hostedUrl?: string },
): string {
	if (plan.hostedUrl) {
		const normalized = normalizeHostedCheckoutTarget(
			plan.hostedUrl,
			plan.planSlug,
		);

		if (normalized.hostedUrl) {
			const url = new URL(normalized.hostedUrl, "https://subpilot.local");
			return url.pathname;
		}
	}

	return `/pay/${plan.merchantSlug}/${plan.planSlug}`;
}

export function mapPlanResponse(dto: PlanResponseDto): Plan {
	const hostedTarget = normalizeHostedCheckoutTarget(dto.hostedUrl, dto.slug);

	return {
		id: dto.id,
		name: dto.name,
		description: dto.description ?? undefined,
		amountKobo: dto.amount,
		interval: intervalFromBackend(dto.billingInterval),
		trialDays: dto.trialDays,
		proration: dto.prorationPolicy,
		status: dto.status,
		merchantSlug: hostedTarget.merchantSlug,
		planSlug: hostedTarget.planSlug,
		createdAt: dto.createdAt,
		hostedUrl: hostedTarget.hostedUrl ?? undefined,
	};
}

export function mapPublicPlanResponse(dto: PublicPlanResponseDto): PublicPlan {
	return {
		name: dto.name,
		description: dto.description ?? undefined,
		amountKobo: dto.amount,
		interval: intervalFromBackend(dto.billingInterval),
		trialDays: dto.trialDays,
		merchantName: dto.merchantName,
		merchantSlug: dto.merchantSlug,
		planSlug: dto.planSlug,
	};
}

function toBackendInterval(interval: EditablePlanInterval) {
	switch (interval.kind) {
		case "monthly":
			return { billingInterval: "monthly" as const };
		case "annual":
			return { billingInterval: "yearly" as const };
		case "weekly":
			return { billingInterval: "weekly" as const };
		case "custom":
			return {
				billingInterval: "custom" as const,
				intervalValue: interval.count,
				intervalUnit:
					interval.unit === "day"
						? "days"
						: interval.unit === "week"
							? "weeks"
							: "months",
			};
	}
}

export const plansQueryOptions = () =>
	queryOptions({
		queryKey: ["plans"],
		queryFn: async () => {
			const page = await listPlansServerFn();
			return page.content.map(mapPlanResponse);
		},
	});

export const planDetailQueryOptions = (planId: string) =>
	queryOptions({
		queryKey: ["plans", planId],
		queryFn: async () =>
			mapPlanResponse(await getPlanServerFn({ data: { planId } })),
	});

export const publicPlanQueryOptions = (
	merchantSlug: string,
	planSlug: string,
) =>
	queryOptions({
		queryKey: ["public-plan", merchantSlug, planSlug],
		queryFn: async () =>
			mapPublicPlanResponse(
				await getPublicPlanServerFn({ data: { merchantSlug, planSlug } }),
			),
	});

export async function createPlan(input: {
	name: string;
	description: string;
	amountKobo: number;
	interval: EditablePlanInterval;
	trialDays: number;
	proration: ProrationPolicy;
}) {
	const interval = toBackendInterval(input.interval);

	return mapPlanResponse(
		await createPlanServerFn({
			data: {
				name: input.name,
				description: input.description.trim() ? input.description.trim() : null,
				amount: input.amountKobo,
				currency: "NGN",
				billingInterval: interval.billingInterval,
				intervalValue:
					"intervalValue" in interval ? interval.intervalValue : undefined,
				intervalUnit:
					"intervalUnit" in interval ? interval.intervalUnit : undefined,
				trialDays: input.trialDays,
				prorationPolicy: input.proration,
			},
		}),
	);
}

export async function updatePlan(input: {
	planId: string;
	name: string;
	description: string;
	trialDays: number;
}) {
	return mapPlanResponse(
		await updatePlanServerFn({
			data: {
				planId: input.planId,
				name: input.name.trim(),
				description: input.description.trim() ? input.description.trim() : null,
				trialDays: input.trialDays,
			},
		}),
	);
}

export async function publishPlan(planId: string) {
	return mapPlanResponse(await publishPlanServerFn({ data: { planId } }));
}

export async function archivePlan(planId: string) {
	return mapPlanResponse(await archivePlanServerFn({ data: { planId } }));
}

export async function initiatePublicCheckout(input: {
	merchantSlug: string;
	planSlug: string;
	fullName: string;
	email: string;
	phone: string;
}) {
	return initiateCheckoutServerFn({
		data: input,
	});
}

export const merchantSlug = "acme-corp";

export const plans: Plan[] = [
	{
		id: "plan_01",
		name: "Growth",
		description: "For teams scaling past their first few hundred customers.",
		amountKobo: 500_000,
		interval: { kind: "monthly" },
		trialDays: 14,
		proration: "credit",
		status: "published",
		merchantSlug,
		planSlug: "growth-plan",
		createdAt: "2026-06-18T09:12:00.000Z",
	},
	{
		id: "plan_02",
		name: "Starter",
		description: "Everything you need to launch recurring billing.",
		amountKobo: 150_000,
		interval: { kind: "monthly" },
		trialDays: 7,
		proration: "none",
		status: "published",
		merchantSlug,
		planSlug: "starter-plan",
		createdAt: "2026-06-10T14:30:00.000Z",
	},
	{
		id: "plan_03",
		name: "Enterprise",
		description: "Priority support and custom onboarding for large teams.",
		amountKobo: 5_000_000,
		interval: { kind: "annual" },
		trialDays: 0,
		proration: "charge",
		status: "published",
		merchantSlug,
		planSlug: "enterprise-plan",
		createdAt: "2026-05-28T11:00:00.000Z",
	},
	{
		id: "plan_04",
		name: "Growth (quarterly trial)",
		description: "Growth plan with an extended evaluation window.",
		amountKobo: 500_000,
		interval: { kind: "custom", count: 3, unit: "month" },
		trialDays: 30,
		proration: "credit",
		status: "draft",
		merchantSlug,
		planSlug: "growth-quarterly",
		createdAt: "2026-06-25T16:45:00.000Z",
	},
	{
		id: "plan_05",
		name: "Weekly Pass",
		description: "Short-term access billed weekly.",
		amountKobo: 25_000,
		interval: { kind: "weekly" },
		trialDays: 0,
		proration: "none",
		status: "draft",
		merchantSlug,
		planSlug: "weekly-pass",
		createdAt: "2026-06-05T08:00:00.000Z",
	},
	{
		id: "plan_06",
		name: "Legacy Basic",
		description: "Retired plan kept for existing subscribers only.",
		amountKobo: 100_000,
		interval: { kind: "monthly" },
		trialDays: 0,
		proration: "none",
		status: "archived",
		merchantSlug,
		planSlug: "legacy-basic",
		createdAt: "2025-11-02T10:15:00.000Z",
	},
	{
		id: "plan_07",
		name: "Team",
		description: "Shared billing for small teams, monthly.",
		amountKobo: 1_200_000,
		interval: { kind: "monthly" },
		trialDays: 14,
		proration: "credit",
		status: "published",
		merchantSlug,
		planSlug: "team-plan",
		createdAt: "2026-06-20T09:00:00.000Z",
	},
	{
		id: "plan_08",
		name: "Team (annual)",
		description: "Team plan billed yearly at a discount.",
		amountKobo: 12_000_000,
		interval: { kind: "annual" },
		trialDays: 14,
		proration: "credit",
		status: "published",
		merchantSlug,
		planSlug: "team-annual",
		createdAt: "2026-06-19T09:00:00.000Z",
	},
	{
		id: "plan_09",
		name: "Solo",
		description: "For individual operators getting started.",
		amountKobo: 250_000,
		interval: { kind: "monthly" },
		trialDays: 7,
		proration: "none",
		status: "published",
		merchantSlug,
		planSlug: "solo-plan",
		createdAt: "2026-06-15T09:00:00.000Z",
	},
	{
		id: "plan_10",
		name: "Solo (annual)",
		description: "Solo plan billed yearly at a discount.",
		amountKobo: 2_500_000,
		interval: { kind: "annual" },
		trialDays: 7,
		proration: "none",
		status: "draft",
		merchantSlug,
		planSlug: "solo-annual",
		createdAt: "2026-06-22T09:00:00.000Z",
	},
	{
		id: "plan_11",
		name: "Nonprofit",
		description: "Discounted pricing for registered nonprofits.",
		amountKobo: 50_000,
		interval: { kind: "monthly" },
		trialDays: 30,
		proration: "credit",
		status: "published",
		merchantSlug,
		planSlug: "nonprofit-plan",
		createdAt: "2026-06-12T09:00:00.000Z",
	},
	{
		id: "plan_12",
		name: "Legacy Pro",
		description: "Retired plan kept for existing subscribers only.",
		amountKobo: 300_000,
		interval: { kind: "monthly" },
		trialDays: 0,
		proration: "charge",
		status: "archived",
		merchantSlug,
		planSlug: "legacy-pro",
		createdAt: "2025-10-14T10:15:00.000Z",
	},
];
