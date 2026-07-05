import { queryOptions } from "@tanstack/react-query";

import {
	getInternalMerchantDetail,
	getInternalMerchantFees,
	listInternalMerchants,
} from "#/lib/api/internal-merchants.ts";
import type { MerchantStatusDto } from "#/types/api.ts";

export const merchantStatusTone: Record<
	MerchantStatusDto,
	"success" | "warning" | "danger" | "neutral"
> = {
	active: "success",
	under_review: "warning",
	suspended: "danger",
};

export const merchantStatusLabel: Record<MerchantStatusDto, string> = {
	active: "Active",
	under_review: "Under review",
	suspended: "Suspended",
};

export const internalMerchantsListQueryOptions = (input: {
	query?: string;
	status?: string;
}) =>
	queryOptions({
		queryKey: ["internal-merchants", input],
		queryFn: () => listInternalMerchants({ data: input }),
	});

export const internalMerchantDetailQueryOptions = (merchantId: string) =>
	queryOptions({
		queryKey: ["internal-merchants", merchantId],
		queryFn: () => getInternalMerchantDetail({ data: { merchantId } }),
	});

export const internalMerchantFeesQueryOptions = (merchantId: string) =>
	queryOptions({
		queryKey: ["internal-merchants", merchantId, "fees"],
		queryFn: () => getInternalMerchantFees({ data: { merchantId } }),
	});
