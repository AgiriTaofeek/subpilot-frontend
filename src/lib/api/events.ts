import { createServerFn } from "@tanstack/react-start";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import { fetchAllPages } from "#/lib/api/pagination.ts";
import type { AuditEventDto, PageResponse } from "#/types/api.ts";

export const listEvents = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		return fetchAllPages((page) =>
			backendRequest<PageResponse<AuditEventDto>>({
				path: "/v1/events",
				search: { page, size: 200 },
			}),
		);
	});
