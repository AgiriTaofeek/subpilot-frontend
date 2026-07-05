import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import {
	listWebhookEndpoints,
	searchWebhookDeliveries,
} from "#/lib/api/webhooks.ts";
import type { PageSize } from "#/lib/pagination-sizes.ts";
import type { WebhookDeliveryStatusDto } from "#/types/api.ts";

export const WEBHOOK_DELIVERIES_PAGE_SIZE: PageSize = 10;

export interface WebhookDeliverySummary {
	id: string;
	endpointId: string;
	endpointUrl: string;
	eventId: string;
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

export const webhookDeliveriesListQueryOptions = (params: {
	status?: WebhookDeliveryStatusDto;
	endpointId?: string;
	eventType?: string;
	page: number;
	size?: PageSize;
}) =>
	queryOptions({
		queryKey: ["webhook-deliveries", params],
		queryFn: async () => {
			const [deliveriesPage, endpoints] = await Promise.all([
				searchWebhookDeliveries({
					data: {
						status: params.status,
						endpointId: params.endpointId,
						eventType: params.eventType,
						page: params.page - 1,
						size: params.size ?? WEBHOOK_DELIVERIES_PAGE_SIZE,
					},
				}),
				listWebhookEndpoints(),
			]);

			const endpointsById = new Map(
				endpoints.map((endpoint) => [endpoint.id, endpoint]),
			);

			return {
				...deliveriesPage,
				content: deliveriesPage.content.map((delivery) => ({
					id: delivery.id,
					endpointId: delivery.endpointId,
					endpointUrl:
						endpointsById.get(delivery.endpointId)?.url ?? "Unknown endpoint",
					eventId: delivery.eventId,
					status: delivery.status,
					attemptCount: delivery.attemptCount,
					lastAttemptedAt: delivery.lastAttemptedAt,
					nextRetryAt: delivery.nextRetryAt,
					responseStatus: delivery.responseStatus,
					responseBody: delivery.responseBody,
					createdAt: delivery.createdAt,
				})),
			};
		},
		placeholderData: keepPreviousData,
	});
