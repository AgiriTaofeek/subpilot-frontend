import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { listEvents } from "#/lib/api/events.ts";
import type { PageSize } from "#/lib/pagination-sizes.ts";
import type { AuditEventTypeDto } from "#/types/api.ts";

export const EVENTS_PAGE_SIZE: PageSize = 10;

export const auditEventTypeGroups: Array<{
	group: string;
	events: AuditEventTypeDto[];
}> = [
	{ group: "Merchant", events: ["MERCHANT_CREATED"] },
	{
		group: "Plan",
		events: ["PLAN_CREATED", "PLAN_UPDATED", "PLAN_PUBLISHED", "PLAN_ARCHIVED"],
	},
	{
		group: "Subscription",
		events: [
			"SUBSCRIPTION_CREATED",
			"SUBSCRIPTION_ACTIVATED",
			"SUBSCRIPTION_RENEWED",
			"SUBSCRIPTION_PAUSED",
			"SUBSCRIPTION_RESUMED",
			"SUBSCRIPTION_CANCELLED",
			"SUBSCRIPTION_EXPIRED",
			"SUBSCRIPTION_PAST_DUE",
			"SUBSCRIPTION_SUSPENDED",
		],
	},
	{
		group: "Payment",
		events: ["PAYMENT_INITIATED", "PAYMENT_SUCCEEDED", "PAYMENT_FAILED"],
	},
	{
		group: "Invoice",
		events: ["INVOICE_CREATED", "INVOICE_PAID", "INVOICE_VOIDED"],
	},
	{
		group: "Dunning",
		events: [
			"DUNNING_STARTED",
			"DUNNING_STEP_EXECUTED",
			"DUNNING_RESOLVED",
			"DUNNING_EXHAUSTED",
			"DUNNING_RECOVERED",
		],
	},
	{ group: "Proration", events: ["PRORATION_APPLIED"] },
	{ group: "Webhook", events: ["WEBHOOK_DELIVERED", "WEBHOOK_FAILED"] },
	{
		group: "Refund",
		events: [
			"REFUND_CREATED",
			"REFUND_SUCCEEDED",
			"REFUND_FAILED",
			"REFUND_REJECTED",
		],
	},
	{
		group: "Payout",
		events: ["PAYOUT_TRIGGERED", "PAYOUT_SUCCEEDED", "PAYOUT_FAILED"],
	},
];

export const eventsListQueryOptions = (params: {
	eventType?: string;
	q?: string;
	page: number;
	size?: PageSize;
}) =>
	queryOptions({
		queryKey: ["events", params],
		queryFn: () =>
			listEvents({
				data: {
					eventType: params.eventType,
					q: params.q,
					page: params.page - 1,
					size: params.size ?? EVENTS_PAGE_SIZE,
				},
			}),
		placeholderData: keepPreviousData,
	});

export function resourceTypeLabel(resourceType: string): string {
	if (!resourceType) return "Unknown";
	return resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
}

export function parsePayload(payload: string): unknown {
	try {
		return JSON.parse(payload);
	} catch {
		return payload;
	}
}

export function payloadPreview(payload: string): string {
	return payload.length > 80 ? `${payload.slice(0, 80)}…` : payload;
}
