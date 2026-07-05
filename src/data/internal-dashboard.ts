import { queryOptions } from "@tanstack/react-query";

import { getInternalDashboardSummary } from "#/lib/api/internal-dashboard.ts";

export const internalDashboardSummaryQueryOptions = () =>
	queryOptions({
		queryKey: ["internal-dashboard-summary"],
		queryFn: () => getInternalDashboardSummary(),
	});
