import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSessionCookieMiddleware } from "#/lib/api/backend.ts";
import { internalBackendRequest } from "#/lib/api/internal-backend.ts";
import type {
	InternalMerchantDetailDto,
	InternalMerchantFeeResponseDto,
	InternalMerchantListItemDto,
	PageResponse,
} from "#/types/api.ts";

const merchantIdSchema = z.object({
	merchantId: z.string().min(1),
});

const listMerchantsSchema = z.object({
	query: z.string().optional(),
	status: z.string().optional(),
	page: z.number().default(0),
	size: z.number().default(20),
});

export const listInternalMerchants = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(listMerchantsSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<PageResponse<InternalMerchantListItemDto>>({
			path: "/v1/internal/merchants",
			search: {
				query: data.query,
				status: data.status,
				page: data.page,
				size: data.size,
			},
		});
	});

export const getInternalMerchantDetail = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(merchantIdSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<InternalMerchantDetailDto>({
			path: `/v1/internal/merchants/${data.merchantId}`,
		});
	});

const updateStatusSchema = z.object({
	merchantId: z.string().min(1),
	status: z.enum(["active", "under_review", "suspended"]),
	reason: z.string().min(1),
});

export const updateInternalMerchantStatus = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(updateStatusSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<InternalMerchantDetailDto>({
			path: `/v1/internal/merchants/${data.merchantId}/status`,
			method: "PATCH",
			body: { status: data.status, reason: data.reason },
		});
	});

export const getInternalMerchantFees = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(merchantIdSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<InternalMerchantFeeResponseDto>({
			path: `/v1/internal/merchants/${data.merchantId}/fees`,
		});
	});

const setFeeOverrideSchema = z.object({
	merchantId: z.string().min(1),
	overrideFeeBps: z.number().min(0),
	overrideFixedFeeMinor: z.number().min(0),
	reason: z.string().min(1),
});

export const setInternalMerchantFeeOverride = createServerFn({
	method: "POST",
})
	.middleware([requireSessionCookieMiddleware])
	.validator(setFeeOverrideSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<InternalMerchantFeeResponseDto>({
			path: `/v1/internal/merchants/${data.merchantId}/fees`,
			method: "PATCH",
			body: {
				overrideFeeBps: data.overrideFeeBps,
				overrideFixedFeeMinor: data.overrideFixedFeeMinor,
				reason: data.reason,
			},
		});
	});

const removeFeeOverrideSchema = z.object({
	merchantId: z.string().min(1),
	reason: z.string().min(1),
});

export const removeInternalMerchantFeeOverride = createServerFn({
	method: "POST",
})
	.middleware([requireSessionCookieMiddleware])
	.validator(removeFeeOverrideSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<InternalMerchantFeeResponseDto>({
			path: `/v1/internal/merchants/${data.merchantId}/fees`,
			method: "DELETE",
			body: { reason: data.reason },
		});
	});
