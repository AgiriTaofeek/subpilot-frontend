import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { backendRequest } from "#/lib/api/backend.ts";
import type { AuditLogDto, PageResponse } from "#/types/api.ts";

const listAuditLogsSchema = z.object({
	resourceType: z.string().optional(),
	resourceId: z.string().optional(),
	action: z.string().optional(),
});

export const listAuditLogs = createServerFn({ method: "GET" })
	.validator(listAuditLogsSchema)
	.handler(async ({ data }) => {
		const page = await backendRequest<PageResponse<AuditLogDto>>({
			path: "/v1/audit-logs",
			search: {
				resourceType: data.resourceType,
				resourceId: data.resourceId,
				action: data.action,
				page: 0,
				perPage: 100,
			},
		});
		return page.content;
	});
