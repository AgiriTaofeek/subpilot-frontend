import { queryOptions } from "@tanstack/react-query";

import { listEvents } from "#/lib/api/events.ts";
import {
	listWebhookDeliveries,
	listWebhookEndpoints,
} from "#/lib/api/webhooks.ts";
import type { WebhookDeliveryStatusDto } from "#/types/api.ts";

export interface WebhookDeliverySummary {
	id: string;
	endpointId: string;
	endpointUrl: string;
	eventId: string;
	eventType: string;
	status: WebhookDeliveryStatusDto;
	attemptCount: number;
	lastAttemptedAt: string | null;
	nextRetryAt: string | null;
	responseStatus: number | null;
	responseBody: string | null;
	createdAt: string;
}

export const deliveryStatusTone: Record<
	WebhookDeliveryStatusDto,
	"success" | "warning" | "danger"
> = {
	succeeded: "success",
	pending: "warning",
	failed: "danger",
};

export const deliveryStatusLabel: Record<WebhookDeliveryStatusDto, string> = {
	succeeded: "Succeeded",
	pending: "Pending",
	failed: "Failed",
};

export function httpStatusColor(status: number | null): string {
	if (status === null) return "text-destructive";
	if (status >= 200 && status < 300) return "text-(--success)";
	if (status >= 300 && status < 400) return "text-(--ink-3)";
	if (status >= 400 && status < 500) return "text-(--warning)";
	return "text-destructive";
}

export const webhookDeliveriesListQueryOptions = () =>
	queryOptions({
		queryKey: ["webhook-deliveries"],
		queryFn: async (): Promise<WebhookDeliverySummary[]> => {
			const [deliveries, endpoints, events] = await Promise.all([
				listWebhookDeliveries(),
				listWebhookEndpoints(),
				listEvents(),
			]);

			const endpointsById = new Map(
				endpoints.map((endpoint) => [endpoint.id, endpoint]),
			);
			const eventsById = new Map(events.map((event) => [event.id, event]));

			return deliveries.map((delivery) => ({
				id: delivery.id,
				endpointId: delivery.endpointId,
				endpointUrl:
					endpointsById.get(delivery.endpointId)?.url ?? "Unknown endpoint",
				eventId: delivery.eventId,
				eventType: eventsById.get(delivery.eventId)?.type ?? "Unknown event",
				status: delivery.status,
				attemptCount: delivery.attemptCount,
				lastAttemptedAt: delivery.lastAttemptedAt,
				nextRetryAt: delivery.nextRetryAt,
				responseStatus: delivery.responseStatus,
				responseBody: delivery.responseBody,
				createdAt: delivery.createdAt,
			}));
		},
	});
