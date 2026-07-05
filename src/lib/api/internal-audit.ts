import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSessionCookieMiddleware } from "#/lib/api/backend.ts";
import { internalBackendRequest } from "#/lib/api/internal-backend.ts";
import type { InternalAuditLogDto, PageResponse } from "#/types/api.ts";

const listInternalAuditLogsSchema = z.object({
	page: z.number().default(0),
	size: z.number().default(10),
});

export const listInternalAuditLogs = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(listInternalAuditLogsSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<PageResponse<InternalAuditLogDto>>({
			path: "/v1/internal/audit",
			search: { page: data.page, size: data.size },
		});
	});
