import { queryOptions } from "@tanstack/react-query";

import { getInternalDefaultFee } from "#/lib/api/internal-fees.ts";

export const internalDefaultFeeQueryOptions = () =>
	queryOptions({
		queryKey: ["internal-default-fee"],
		queryFn: () => getInternalDefaultFee(),
	});
