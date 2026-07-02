import { createServerFn } from "@tanstack/react-start";

import { backendRequest } from "#/lib/api/backend.ts";
import type { AuditEventDto, PageResponse } from "#/types/api.ts";

export const listEvents = createServerFn({ method: "GET" }).handler(
	async () => {
		const page = await backendRequest<PageResponse<AuditEventDto>>({
			path: "/v1/events",
			search: { page: 0, size: 200 },
		});
		return page.content;
	},
);
