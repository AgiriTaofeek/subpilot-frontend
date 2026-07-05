import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import { fetchAllPages } from "#/lib/api/pagination.ts";
import type { AuditLogDto, PageResponse } from "#/types/api.ts";

const listAuditLogsSchema = z.object({
	resourceType: z.string().optional(),
	resourceId: z.string().optional(),
	action: z.string().optional(),
});

export const listAuditLogs = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(listAuditLogsSchema)
	.handler(async ({ data }) => {
		return fetchAllPages((page) =>
			backendRequest<PageResponse<AuditLogDto>>({
				path: "/v1/audit-logs",
				search: {
					resourceType: data.resourceType,
					resourceId: data.resourceId,
					action: data.action,
					page,
					perPage: 100,
				},
			}),
		);
	});
