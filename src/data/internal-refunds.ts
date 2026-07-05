import { queryOptions } from "@tanstack/react-query";

import { listInternalRefunds } from "#/lib/api/internal-refunds.ts";

export const internalRefundsListQueryOptions = () =>
	queryOptions({
		queryKey: ["internal-refunds"],
		queryFn: () => listInternalRefunds(),
	});
