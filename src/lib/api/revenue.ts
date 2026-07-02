import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { backendRequest } from "#/lib/api/backend.ts";
import type { FeeSummaryDto, MerchantFeeRateDto } from "#/types/api.ts";

const feeSummarySchema = z.object({
	days: z.number().int().positive(),
});

export const getFeeSummary = createServerFn({ method: "GET" })
	.validator(feeSummarySchema)
	.handler(async ({ data }) => {
		return backendRequest<FeeSummaryDto>({
			path: "/v1/fees/summary",
			search: { days: data.days },
		});
	});

export const getFeeRate = createServerFn({ method: "GET" }).handler(
	async () => {
		return backendRequest<MerchantFeeRateDto>({ path: "/v1/fees/rate" });
	},
);
