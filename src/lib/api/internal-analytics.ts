import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSessionCookieMiddleware } from "#/lib/api/backend.ts";
import { internalBackendRequest } from "#/lib/api/internal-backend.ts";
import {
	internalAnalyticsResponseSchema,
	internalMerchantRevenueRowSchema,
} from "#/lib/api/response-schemas.ts";
import type {
	InternalAnalyticsResponseDto,
	InternalMerchantRevenueRowDto,
} from "#/types/api.ts";

// Bound to InternalAnalyticsService.MerchantSortField's exact enum constant
// names — Spring's default String->Enum binding is case-sensitive, so these
// must stay uppercase even though every other string param on this endpoint
// is free-form.
const sortFieldSchema = z.enum([
	"GROSS",
	"FEE",
	"NET",
	"TRANSACTIONS",
	"ACTIVE_SUBSCRIPTIONS",
	"NAME",
]);

const analyticsQuerySchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
	minGrossMinor: z.number().optional(),
	merchantStatus: z.string().optional(),
	nameQuery: z.string().optional(),
	sortBy: sortFieldSchema.default("GROSS"),
	sortDesc: z.boolean().default(true),
});

// InternalAnalyticsController imposes no role check — any authenticated
// internal admin session can call this. Restricting it to super_admin is a
// frontend-only decision (see the Analytics nav item / route), matching how
// Refunds is gated even though nothing stops a regular admin from hitting
// these paths directly.
export const getInternalAnalytics = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(analyticsQuerySchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<InternalAnalyticsResponseDto>({
			path: "/v1/internal/analytics",
			search: {
				from: data.from,
				to: data.to,
				minGrossMinor: data.minGrossMinor,
				merchantStatus: data.merchantStatus,
				nameQuery: data.nameQuery,
				sortBy: data.sortBy,
				sortDesc: String(data.sortDesc),
			},
			responseSchema: internalAnalyticsResponseSchema(),
		});
	});

const merchantAnalyticsSchema = z.object({
	merchantId: z.string().min(1),
	from: z.string().optional(),
	to: z.string().optional(),
});

export const getInternalMerchantAnalytics = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(merchantAnalyticsSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<InternalMerchantRevenueRowDto>({
			path: `/v1/internal/analytics/merchants/${data.merchantId}`,
			search: { from: data.from, to: data.to },
			responseSchema: internalMerchantRevenueRowSchema(),
		});
	});
