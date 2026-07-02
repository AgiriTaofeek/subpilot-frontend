import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { backendRequest } from "#/lib/api/backend.ts";
import type {
	PageResponse,
	RegisterEndpointRequestDto,
	WebhookDeliveryDto,
	WebhookEndpointDto,
} from "#/types/api.ts";

export const listWebhookEndpoints = createServerFn({ method: "GET" }).handler(
	async () => {
		const page = await backendRequest<PageResponse<WebhookEndpointDto>>({
			path: "/v1/webhooks/endpoints",
			search: { page: 0, size: 100 },
		});
		return page.content;
	},
);

const registerSchema = z.object({
	url: z.string().min(1),
	description: z.string().optional(),
	events: z.array(z.string()).min(1),
});

export const registerWebhookEndpoint = createServerFn({ method: "POST" })
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
	.validator(endpointIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<{ message: string }>({
			path: `/v1/webhooks/endpoints/${data.endpointId}`,
			method: "DELETE",
		});
	});

export const listWebhookDeliveries = createServerFn({ method: "GET" }).handler(
	async () => {
		const page = await backendRequest<PageResponse<WebhookDeliveryDto>>({
			path: "/v1/webhooks/deliveries",
			search: { page: 0, size: 200 },
		});
		return page.content;
	},
);
