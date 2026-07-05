import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import type { AuditLogDto, PageResponse } from "#/types/api.ts";

const listAuditLogsSchema = z.object({
	resourceType: z.string().optional(),
	resourceId: z.string().optional(),
	action: z.string().optional(),
	q: z.string().optional(),
	page: z.number().default(0),
	perPage: z.number().default(10),
});

export const listAuditLogs = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(listAuditLogsSchema)
	.handler(async ({ data }) => {
		return backendRequest<PageResponse<AuditLogDto>>({
			path: "/v1/audit-logs",
			search: {
				resourceType: data.resourceType,
				resourceId: data.resourceId,
				action: data.action,
				q: data.q,
				page: data.page,
				perPage: data.perPage,
			},
		});
	});
