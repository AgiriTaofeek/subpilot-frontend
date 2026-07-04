import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { backendRequest } from "#/lib/api/backend.ts";
import type {
	DisbursementDto,
	PageResponse,
	PayoutBankDto,
	PayoutBankLookupResultDto,
} from "#/types/api.ts";

export const listPayoutBanks = createServerFn({ method: "GET" }).handler(
	async () => {
		return backendRequest<PayoutBankDto[]>({
			path: "/v1/merchants/me/payout-banks",
		});
	},
);

const payoutAccountSchema = z.object({
	accountNumber: z.string().min(1),
	bankCode: z.string().min(1),
});

export const lookupPayoutAccount = createServerFn({ method: "POST" })
	.validator(payoutAccountSchema)
	.handler(async ({ data }) => {
		return backendRequest<PayoutBankLookupResultDto>({
			path: "/v1/merchants/me/payout-account/lookup",
			method: "POST",
			body: data,
		});
	});

export const savePayoutAccount = createServerFn({ method: "POST" })
	.validator(payoutAccountSchema)
	.handler(async ({ data }) => {
		return backendRequest<PayoutBankLookupResultDto>({
			path: "/v1/merchants/me/payout-account",
			method: "PATCH",
			body: data,
		});
	});

export const triggerDisbursement = createServerFn({ method: "POST" }).handler(
	async () => {
		return backendRequest<DisbursementDto>({
			path: "/v1/payouts/trigger",
			method: "POST",
		});
	},
);

const listDisbursementsSchema = z.object({
	page: z.number(),
	size: z.number(),
});

export const listDisbursements = createServerFn({ method: "GET" })
	.validator(listDisbursementsSchema)
	.handler(async ({ data }) => {
		return backendRequest<PageResponse<DisbursementDto>>({
			path: "/v1/payouts",
			search: { page: data.page, size: data.size },
		});
	});
