import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { listInternalAuditLogs } from "#/lib/api/internal-audit.ts";
import type { PageSize } from "#/lib/pagination-sizes.ts";

export const INTERNAL_AUDIT_LOGS_PAGE_SIZE: PageSize = 10;

export const internalAuditLogsQueryOptions = (params: {
	page: number;
	size?: PageSize;
}) =>
	queryOptions({
		queryKey: ["internal-audit-logs", params],
		queryFn: () =>
			listInternalAuditLogs({
				data: {
					page: params.page - 1,
					size: params.size ?? INTERNAL_AUDIT_LOGS_PAGE_SIZE,
				},
			}),
		placeholderData: keepPreviousData,
	});
