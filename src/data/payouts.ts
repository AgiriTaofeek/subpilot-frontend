import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import {
	getPayoutAccount,
	listDisbursements,
	listPayoutBanks,
} from "#/lib/api/payouts.ts";
import type { PageSize } from "#/lib/pagination-sizes.ts";

export const PAYOUTS_PAGE_SIZE: PageSize = 10;

export const payoutBanksQueryOptions = () =>
	queryOptions({
		queryKey: ["payout-banks"],
		queryFn: () => listPayoutBanks(),
		// Bank list is effectively static reference data, not operational —
		// same reasoning as apiKeysListQueryOptions's staleTime.
		staleTime: 120_000,
	});

export const payoutAccountQueryOptions = () =>
	queryOptions({
		queryKey: ["payout-account"],
		queryFn: () => getPayoutAccount(),
	});

// `page` here is 1-based (matches the URL search param convention every
// other list route uses) — translated to the backend's 0-based `page`
// query param inside listDisbursements's caller, not here, so this key
// stays aligned with what the UI actually shows.
export const disbursementsQueryOptions = (page: number, size?: PageSize) =>
	queryOptions({
		queryKey: ["payouts", page, size],
		queryFn: () =>
			listDisbursements({
				data: { page: page - 1, size: size ?? PAYOUTS_PAGE_SIZE },
			}),
		placeholderData: keepPreviousData,
	});
