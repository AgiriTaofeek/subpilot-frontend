import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import {
	listInternalRefunds,
	listInternalRefundsHistory,
} from "#/lib/api/internal-refunds.ts";
import type { PageSize } from "#/lib/pagination-sizes.ts";
import type { RefundSortFieldDto } from "#/types/api.ts";

export const INTERNAL_REFUNDS_HISTORY_PAGE_SIZE: PageSize = 20;

export const internalRefundsListQueryOptions = () =>
	queryOptions({
		queryKey: ["internal-refunds"],
		queryFn: () => listInternalRefunds(),
	});

export const internalRefundsHistoryQueryOptions = (input: {
	status: string;
	merchantId: string;
	resolvedBy: string;
	from?: string;
	to?: string;
	page: number;
	size: PageSize;
	sortBy: RefundSortFieldDto;
	sortDir: "asc" | "desc";
}) =>
	queryOptions({
		queryKey: ["internal-refunds", "history", input],
		queryFn: () =>
			listInternalRefundsHistory({
				data: {
					status: input.status || undefined,
					merchantId: input.merchantId || undefined,
					resolvedBy: input.resolvedBy || undefined,
					from: input.from,
					to: input.to,
					page: input.page - 1,
					size: input.size,
					sortBy: input.sortBy,
					sortDir: input.sortDir,
				},
			}),
		placeholderData: keepPreviousData,
	});
