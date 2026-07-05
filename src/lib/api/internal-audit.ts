import { createServerFn } from "@tanstack/react-start";

import { requireSessionCookieMiddleware } from "#/lib/api/backend.ts";
import { internalBackendRequest } from "#/lib/api/internal-backend.ts";
import { fetchAllPages } from "#/lib/api/pagination.ts";
import type { InternalAuditLogDto, PageResponse } from "#/types/api.ts";

export const listInternalAuditLogs = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		return fetchAllPages(
			(page) =>
				internalBackendRequest<PageResponse<InternalAuditLogDto>>({
					path: "/v1/internal/audit",
					search: { page, size: 100 },
				}),
			(log) => log.auditId,
		);
	});
