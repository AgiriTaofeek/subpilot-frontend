import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import {
	getInternalMerchantDetail,
	getInternalMerchantFees,
	listInternalMerchants,
} from "#/lib/api/internal-merchants.ts";
import type { PageSize } from "#/lib/pagination-sizes.ts";
import type { MerchantStatusDto } from "#/types/api.ts";

export const INTERNAL_MERCHANTS_PAGE_SIZE: PageSize = 20;

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
	page: number;
	size?: PageSize;
}) =>
	queryOptions({
		queryKey: ["internal-merchants", input],
		queryFn: () =>
			listInternalMerchants({
				data: {
					query: input.query,
					status: input.status,
					page: input.page - 1,
					size: input.size ?? INTERNAL_MERCHANTS_PAGE_SIZE,
				},
			}),
		placeholderData: keepPreviousData,
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
