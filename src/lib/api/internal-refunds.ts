import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSessionCookieMiddleware } from "#/lib/api/backend.ts";
import { internalBackendRequest } from "#/lib/api/internal-backend.ts";
import type { RefundResponseDto } from "#/types/api.ts";

export const listInternalRefunds = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		return internalBackendRequest<RefundResponseDto[]>({
			path: "/v1/internal/refunds",
		});
	});

const refundIdSchema = z.object({
	refundId: z.string().min(1),
});

export const approveInternalRefund = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(refundIdSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<RefundResponseDto>({
			path: `/v1/internal/refunds/${data.refundId}/approve`,
			method: "POST",
		});
	});

const rejectRefundSchema = z.object({
	refundId: z.string().min(1),
	reason: z.string().max(500).optional(),
});

export const rejectInternalRefund = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(rejectRefundSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<RefundResponseDto>({
			path: `/v1/internal/refunds/${data.refundId}/reject`,
			method: "POST",
			body: { reason: data.reason },
		});
	});
