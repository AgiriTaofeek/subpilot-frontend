import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { mapPlanResponse } from "#/data/plans.ts";
import {
	countPastDueSubscriptions,
	getSubscriptionDetail,
	listSubscriptionSummaries,
	searchSubscriptionSummaries,
} from "#/lib/api/subscriptions.ts";
import type { PageSize } from "#/lib/pagination-sizes.ts";

export const SUBSCRIPTIONS_PAGE_SIZE: PageSize = 10;

export type SubscriptionStatus =
	| "trialing"
	| "active"
	| "past_due"
	| "suspended"
	| "paused"
	| "cancelled"
	| "expired";

export interface SubscriptionSummary {
	id: string;
	customerId: string;
	customerName: string;
	customerEmail: string;
	planId: string;
	planName: string;
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
	suspended: "neutral",
	paused: "neutral",
	cancelled: "neutral",
	expired: "neutral",
};

export const subscriptionStatusLabel: Record<SubscriptionStatus, string> = {
	trialing: "Trialing",
	active: "Active",
	past_due: "Past due",
	suspended: "Suspended",
	paused: "Paused",
	cancelled: "Cancelled",
	expired: "Expired",
};

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

export const subscriptionsListQueryOptions = () =>
	queryOptions({
		queryKey: ["subscriptions"],
		queryFn: () => listSubscriptionSummaries(),
	});

export const pastDueSubscriptionsCountQueryOptions = () =>
	queryOptions({
		queryKey: ["subscriptions", "past-due-count"],
		queryFn: () => countPastDueSubscriptions(),
	});

export const subscriptionsListPageQueryOptions = (params: {
	status?: SubscriptionStatus;
	planId?: string;
	q?: string;
	page: number;
	size?: PageSize;
}) =>
	queryOptions({
		queryKey: ["subscriptions", "list", params],
		queryFn: () =>
			searchSubscriptionSummaries({
				data: {
					status: params.status,
					planId: params.planId,
					q: params.q,
					page: params.page - 1,
					size: params.size ?? SUBSCRIPTIONS_PAGE_SIZE,
				},
			}),
		placeholderData: keepPreviousData,
	});

export const subscriptionDetailQueryOptions = (subscriptionId: string) =>
	queryOptions({
		queryKey: ["subscriptions", subscriptionId],
		queryFn: async () => {
			const detail = await getSubscriptionDetail({ data: { subscriptionId } });
			return {
				subscription: detail.subscription,
				customer: detail.customer,
				plan: mapPlanResponse(detail.plan),
			};
		},
	});
