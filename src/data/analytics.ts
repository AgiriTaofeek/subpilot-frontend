import { queryOptions } from "@tanstack/react-query";

import {
	getAnalyticsSummary,
	getDunningRecoveryRateTrend,
	getPaymentSuccessRateTrend,
	getRevenueOverTime,
	getSubscriptionGrowth,
} from "#/lib/api/analytics.ts";

export type AnalyticsWindow = "7d" | "30d" | "90d";

export function windowToRangeDays(window: AnalyticsWindow): number {
	return window === "7d" ? 7 : window === "30d" ? 30 : 90;
}

export const analyticsSummaryQueryOptions = (window: AnalyticsWindow) =>
	queryOptions({
		queryKey: ["analytics", "summary", window],
		queryFn: () =>
			getAnalyticsSummary({ data: { rangeDays: windowToRangeDays(window) } }),
	});

export const revenueOverTimeQueryOptions = (window: AnalyticsWindow) =>
	queryOptions({
		queryKey: ["analytics", "revenue-chart", window],
		queryFn: () =>
			getRevenueOverTime({
				data: { rangeDays: windowToRangeDays(window), granularity: "daily" },
			}),
	});

export const subscriptionGrowthQueryOptions = (window: AnalyticsWindow) =>
	queryOptions({
		queryKey: ["analytics", "subscription-growth-chart", window],
		queryFn: () =>
			getSubscriptionGrowth({
				data: { rangeDays: windowToRangeDays(window), granularity: "daily" },
			}),
	});

export const paymentSuccessRateQueryOptions = (window: AnalyticsWindow) =>
	queryOptions({
		queryKey: ["analytics", "payment-success-rate-chart", window],
		queryFn: () =>
			getPaymentSuccessRateTrend({
				data: { rangeDays: windowToRangeDays(window) },
			}),
	});

export const dunningRecoveryRateQueryOptions = (window: AnalyticsWindow) =>
	queryOptions({
		queryKey: ["analytics", "dunning-recovery-rate-chart", window],
		queryFn: () =>
			getDunningRecoveryRateTrend({
				data: { rangeDays: windowToRangeDays(window) },
			}),
	});
