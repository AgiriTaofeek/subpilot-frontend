import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSessionCookieMiddleware } from "#/lib/api/backend.ts";
import { internalBackendRequest } from "#/lib/api/internal-backend.ts";
import { internalDefaultFeeResponseSchema } from "#/lib/api/response-schemas.ts";
import type { InternalDefaultFeeResponseDto } from "#/types/api.ts";

export const getInternalDefaultFee = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		return internalBackendRequest<InternalDefaultFeeResponseDto>({
			path: "/v1/internal/fees/default",
			responseSchema: internalDefaultFeeResponseSchema(),
		});
	});

const updateDefaultFeeSchema = z.object({
	feeBps: z.number().min(0),
	fixedFeeMinor: z.number().min(0),
	reason: z.string().min(1),
});

export const updateInternalDefaultFee = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(updateDefaultFeeSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<InternalDefaultFeeResponseDto>({
			path: "/v1/internal/fees/default",
			method: "PATCH",
			body: data,
			responseSchema: internalDefaultFeeResponseSchema(),
		});
	});
