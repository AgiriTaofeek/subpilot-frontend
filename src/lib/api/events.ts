import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import {
	auditEventSchema,
	pageResponseSchema,
} from "#/lib/api/response-schemas.ts";
import type { AuditEventDto, PageResponse } from "#/types/api.ts";

const listEventsSchema = z.object({
	eventType: z.string().optional(),
	q: z.string().optional(),
	page: z.number().default(0),
	size: z.number().default(10),
});

export const listEvents = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(listEventsSchema)
	.handler(async ({ data }) => {
		return backendRequest<PageResponse<AuditEventDto>>({
			path: "/v1/events",
			search: {
				type: data.eventType,
				q: data.q,
				page: data.page,
				size: data.size,
			},
			responseSchema: pageResponseSchema(auditEventSchema()),
		});
	});
