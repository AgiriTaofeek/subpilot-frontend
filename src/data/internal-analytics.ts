import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
	merchantStatusLabel,
	merchantStatusTone,
} from "#/data/internal-merchants.ts";
import {
	getInternalAnalytics,
	getInternalMerchantAnalytics,
} from "#/lib/api/internal-analytics.ts";
import type {
	InternalAnalyticsSortFieldDto,
	MerchantStatusDto,
} from "#/types/api.ts";

export const analyticsWindows = ["7d", "30d", "90d"] as const;
export type AnalyticsWindow = (typeof analyticsWindows)[number];

function windowDays(window: AnalyticsWindow): number {
	return window === "7d" ? 7 : window === "30d" ? 30 : 90;
}

// Instant.parse (SubscriptionService et al.) requires a full ISO-8601
// instant, which Date#toISOString already produces — no separate formatting
// needed on this side of the boundary.
function windowRange(window: AnalyticsWindow): { from: string; to: string } {
	const to = new Date();
	const from = new Date(to);
	from.setUTCDate(from.getUTCDate() - windowDays(window));
	return { from: from.toISOString(), to: to.toISOString() };
}

// merchantStatusTone/merchantStatusLabel (internal-merchants.ts) are closed
// Records over the 3 real MerchantStatusDto values — deliberately not
// widened to cover "unknown" there, since every other consumer of those
// maps only ever sees a real status. This analytics-only row can carry
// "unknown" (see InternalMerchantRevenueRowDto), so it gets its own
// fallback here instead.
export function merchantRevenueStatusTone(
	status: MerchantStatusDto | "unknown",
): "success" | "warning" | "danger" | "neutral" {
	return status === "unknown" ? "neutral" : merchantStatusTone[status];
}

export function merchantRevenueStatusLabel(
	status: MerchantStatusDto | "unknown",
): string {
	return status === "unknown" ? "Unknown" : merchantStatusLabel[status];
}

export const analyticsSortFieldLabel: Record<
	InternalAnalyticsSortFieldDto,
	string
> = {
	GROSS: "Gross",
	FEE: "SubPilot fee",
	NET: "Net",
	TRANSACTIONS: "Transactions",
	ACTIVE_SUBSCRIPTIONS: "Active subscriptions",
	NAME: "Name",
};

export const internalAnalyticsQueryOptions = (input: {
	window: AnalyticsWindow;
	minGrossMinor?: number;
	merchantStatus?: string;
	nameQuery?: string;
	sortBy: InternalAnalyticsSortFieldDto;
	sortDesc: boolean;
}) => {
	const { from, to } = windowRange(input.window);

	return queryOptions({
		queryKey: ["internal-analytics", { ...input, from, to }],
		queryFn: () =>
			getInternalAnalytics({
				data: {
					from,
					to,
					minGrossMinor: input.minGrossMinor,
					merchantStatus: input.merchantStatus,
					nameQuery: input.nameQuery,
					sortBy: input.sortBy,
					sortDesc: input.sortDesc,
				},
			}),
		placeholderData: keepPreviousData,
	});
};

export const internalMerchantAnalyticsQueryOptions = (
	merchantId: string,
	window: AnalyticsWindow = "30d",
) => {
	const { from, to } = windowRange(window);

	return queryOptions({
		queryKey: ["internal-analytics", "merchant", merchantId, window],
		queryFn: () =>
			getInternalMerchantAnalytics({ data: { merchantId, from, to } }),
	});
};
