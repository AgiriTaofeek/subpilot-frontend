import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import type { AnalyticsSummaryDto, TimeSeriesChartDto } from "#/types/api.ts";

const rangeDaysSchema = z.object({
	rangeDays: z.number().int().positive(),
});

const chartWithGranularitySchema = z.object({
	rangeDays: z.number().int().positive(),
	granularity: z.string().default("daily"),
});

export const getAnalyticsSummary = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(rangeDaysSchema)
	.handler(async ({ data }) => {
		return backendRequest<AnalyticsSummaryDto>({
			path: "/v1/analytics/summary",
			search: { rangeDays: data.rangeDays },
		});
	});

export const getRevenueOverTime = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(chartWithGranularitySchema)
	.handler(async ({ data }) => {
		return backendRequest<TimeSeriesChartDto>({
			path: "/v1/analytics/charts/revenue",
			search: { rangeDays: data.rangeDays, granularity: data.granularity },
		});
	});

export const getSubscriptionGrowth = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(chartWithGranularitySchema)
	.handler(async ({ data }) => {
		return backendRequest<TimeSeriesChartDto>({
			path: "/v1/analytics/charts/subscription-growth",
			search: { rangeDays: data.rangeDays, granularity: data.granularity },
		});
	});

export const getPaymentSuccessRateTrend = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(rangeDaysSchema)
	.handler(async ({ data }) => {
		return backendRequest<TimeSeriesChartDto>({
			path: "/v1/analytics/charts/payment-success-rate",
			search: { rangeDays: data.rangeDays },
		});
	});

export const getDunningRecoveryRateTrend = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(rangeDaysSchema)
	.handler(async ({ data }) => {
		return backendRequest<TimeSeriesChartDto>({
			path: "/v1/analytics/charts/dunning-recovery-rate",
			search: { rangeDays: data.rangeDays },
		});
	});
