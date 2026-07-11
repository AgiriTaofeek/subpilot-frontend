import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSessionCookieMiddleware } from "#/lib/api/backend.ts";
import { internalBackendRequest } from "#/lib/api/internal-backend.ts";
import {
	adminRefundResponseSchema,
	pageResponseSchema,
	refundResponseSchema,
} from "#/lib/api/response-schemas.ts";
import type {
	AdminRefundResponseDto,
	PageResponse,
	RefundResponseDto,
} from "#/types/api.ts";

export const listInternalRefunds = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		return internalBackendRequest<RefundResponseDto[]>({
			path: "/v1/internal/refunds",
			responseSchema: z.array(refundResponseSchema()),
		});
	});

const sortFieldSchema = z.enum([
	"createdAt",
	"resolvedAt",
	"amount",
	"status",
	"merchantId",
]);

const refundHistorySchema = z.object({
	status: z.string().optional(),
	merchantId: z.string().optional(),
	resolvedBy: z.string().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
	page: z.number().default(0),
	size: z.number().default(20),
	sortBy: sortFieldSchema.default("createdAt"),
	sortDir: z.enum(["asc", "desc"]).default("desc"),
});

// GET /v1/internal/refunds/all — unlike listInternalRefunds (pending-only,
// used for the approval queue), this returns every refund regardless of
// status. The backend imposes no super_admin check on this endpoint (only
// approve/reject are role-gated) — this app still restricts the whole
// Refunds page to super_admin client-side, same as the rest of that page.
export const listInternalRefundsHistory = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(refundHistorySchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<PageResponse<AdminRefundResponseDto>>({
			path: "/v1/internal/refunds/all",
			search: {
				status: data.status,
				merchantId: data.merchantId,
				resolvedBy: data.resolvedBy,
				from: data.from,
				to: data.to,
				page: data.page,
				size: data.size,
				sortBy: data.sortBy,
				sortDir: data.sortDir,
			},
			responseSchema: pageResponseSchema(adminRefundResponseSchema()),
		});
	});

const approveRefundSchema = z.object({
	refundId: z.string().min(1),
	adminIdentity: z.string().min(1),
});

export const approveInternalRefund = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(approveRefundSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<RefundResponseDto>({
			path: `/v1/internal/refunds/${data.refundId}/approve`,
			method: "POST",
			headers: { "X-Admin-Identity": data.adminIdentity },
			responseSchema: refundResponseSchema(),
		});
	});

const rejectRefundSchema = z.object({
	refundId: z.string().min(1),
	reason: z.string().max(500).optional(),
	adminIdentity: z.string().min(1),
});

export const rejectInternalRefund = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(rejectRefundSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<RefundResponseDto>({
			path: `/v1/internal/refunds/${data.refundId}/reject`,
			method: "POST",
			headers: { "X-Admin-Identity": data.adminIdentity },
			body: { reason: data.reason },
			responseSchema: refundResponseSchema(),
		});
	});
