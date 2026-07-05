import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import type {
	PageResponse,
	RegisterEndpointRequestDto,
	WebhookDeliveryDto,
	WebhookEndpointDto,
} from "#/types/api.ts";

export const listWebhookEndpoints = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		const page = await backendRequest<PageResponse<WebhookEndpointDto>>({
			path: "/v1/webhooks/endpoints",
			search: { page: 0, size: 100 },
		});
		return page.content;
	});

const registerSchema = z.object({
	url: z.string().min(1),
	description: z.string().optional(),
	events: z.array(z.string()).min(1),
});

export const registerWebhookEndpoint = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(registerSchema)
	.handler(async ({ data }) => {
		return backendRequest<WebhookEndpointDto>({
			path: "/v1/webhooks/endpoints",
			method: "POST",
			body: {
				url: data.url,
				description: data.description,
				events: data.events,
			} satisfies RegisterEndpointRequestDto,
		});
	});

const endpointIdSchema = z.object({
	endpointId: z.string().min(1),
});

export const deleteWebhookEndpoint = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(endpointIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<{ message: string }>({
			path: `/v1/webhooks/endpoints/${data.endpointId}`,
			method: "DELETE",
		});
	});

const searchDeliveriesSchema = z.object({
	status: z.string().optional(),
	endpointId: z.string().optional(),
	eventType: z.string().optional(),
	page: z.number().default(0),
	size: z.number().default(10),
});

export const searchWebhookDeliveries = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(searchDeliveriesSchema)
	.handler(async ({ data }) => {
		return backendRequest<PageResponse<WebhookDeliveryDto>>({
			path: "/v1/webhooks/deliveries",
			search: {
				status: data.status,
				endpointId: data.endpointId,
				eventType: data.eventType,
				page: data.page,
				size: data.size,
			},
		});
	});
