import { queryOptions } from "@tanstack/react-query";

import { listInternalAuditLogs } from "#/lib/api/internal-audit.ts";

export const internalAuditLogsQueryOptions = () =>
	queryOptions({
		queryKey: ["internal-audit-logs"],
		queryFn: () => listInternalAuditLogs(),
	});
