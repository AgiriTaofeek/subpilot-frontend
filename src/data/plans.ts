import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import {
	archivePlan as archivePlanServerFn,
	createPlan as createPlanServerFn,
	getPlan as getPlanServerFn,
	getPublicPlan as getPublicPlanServerFn,
	initiateCheckout as initiateCheckoutServerFn,
	listPlans as listPlansServerFn,
	publishPlan as publishPlanServerFn,
	searchPlans as searchPlansServerFn,
	updatePlan as updatePlanServerFn,
} from "#/lib/api/plans.ts";
import type { PageSize } from "#/lib/pagination-sizes.ts";
import type {
	BillingIntervalDto,
	MerchantStatusDto,
	PlanResponseDto,
	PublicPlanResponseDto,
} from "#/types/api.ts";

// Mirrors the backend's merchant-status gate (PlanService.create and
// friends) — a merchant that isn't active yet (or no longer is) can't
// create plans, API keys, or webhook endpoints. `reason` is used by
// RestrictedAction's per-action tooltip; `title`/`description` are the
// account-wide banner shown on every dashboard page, so they must stay
// generic rather than naming any one gated action.
export const restrictedMerchantStatusCopy: Record<
	Exclude<MerchantStatusDto, "active">,
	{ reason: string; title: string; description: string }
> = {
	under_review: {
		reason: "Your account is under review.",
		title: "Account under review",
		description:
			"Creating plans, API keys, and webhook endpoints unlocks once your account is approved.",
	},
	suspended: {
		reason: "Your account is suspended.",
		title: "Account suspended",
		description:
			"Creating plans, API keys, and webhook endpoints is disabled while your account is suspended. Contact admin@subpilot.co for assistance.",
	},
};

export type PlanStatus = "draft" | "published" | "archived";

export type ProrationPolicy = "none" | "credit" | "charge";

export type EditablePlanInterval =
	| { kind: "daily" }
	| { kind: "weekly" }
	| { kind: "monthly" }
	| { kind: "quarterly" }
	| { kind: "annual" }
	| { kind: "custom"; count: number; unit: "day" | "week" | "month" };

export type PlanInterval =
	| EditablePlanInterval
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

export function intervalFromBackend(
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
		case "daily":
			return { billingInterval: "daily" as const };
		case "weekly":
			return { billingInterval: "weekly" as const };
		case "monthly":
			return { billingInterval: "monthly" as const };
		case "quarterly":
			return { billingInterval: "quarterly" as const };
		case "annual":
			return { billingInterval: "yearly" as const };
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

export const PLANS_PAGE_SIZE: PageSize = 10;

export const plansQueryOptions = () =>
	queryOptions({
		queryKey: ["plans"],
		queryFn: async () => {
			const plans = await listPlansServerFn();
			return plans.map(mapPlanResponse);
		},
		// Plan catalog, not operational data — mutations already invalidate
		// this key directly, so a longer staleTime just avoids re-fetching on
		// every incidental revisit.
		staleTime: 120_000,
	});

export const plansListQueryOptions = (params: {
	q?: string;
	status?: PlanStatus;
	sort?: string;
	order?: "asc" | "desc";
	page: number;
	size?: PageSize;
}) =>
	queryOptions({
		queryKey: ["plans", "list", params],
		queryFn: async () => {
			const page = await searchPlansServerFn({
				data: {
					q: params.q,
					status: params.status,
					sort: params.sort ? `${params.sort},${params.order}` : undefined,
					page: params.page - 1,
					perPage: params.size ?? PLANS_PAGE_SIZE,
				},
			});
			return { ...page, content: page.content.map(mapPlanResponse) };
		},
		placeholderData: keepPreviousData,
	});

export const planDetailQueryOptions = (planId: string) =>
	queryOptions({
		queryKey: ["plans", planId],
		queryFn: async () =>
			mapPlanResponse(await getPlanServerFn({ data: { planId } })),
		staleTime: 120_000,
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
		// Anonymous checkout page for a single plan — effectively static for
		// the duration of a checkout session.
		staleTime: 120_000,
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
