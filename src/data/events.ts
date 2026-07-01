export type AuditResourceType =
	| "subscription"
	| "customer"
	| "invoice"
	| "plan"
	| "webhook";

export type AuditEventType =
	| "subscription.activated"
	| "subscription.cancelled"
	| "subscription.past_due"
	| "subscription.paused"
	| "subscription.resumed"
	| "subscription.expired"
	| "invoice.paid"
	| "invoice.void"
	| "payment.succeeded"
	| "payment.failed"
	| "plan.published"
	| "plan.archived"
	| "customer.created"
	| "webhook.delivery.succeeded"
	| "webhook.delivery.failed";

export const auditEventTypeGroups: Array<{
	group: string;
	events: AuditEventType[];
}> = [
	{
		group: "Subscription",
		events: [
			"subscription.activated",
			"subscription.cancelled",
			"subscription.past_due",
			"subscription.paused",
			"subscription.resumed",
			"subscription.expired",
		],
	},
	{ group: "Invoice", events: ["invoice.paid", "invoice.void"] },
	{ group: "Payment", events: ["payment.succeeded", "payment.failed"] },
	{ group: "Plan", events: ["plan.published", "plan.archived"] },
	{ group: "Customer", events: ["customer.created"] },
	{
		group: "Webhook",
		events: ["webhook.delivery.succeeded", "webhook.delivery.failed"],
	},
];

export interface AuditEvent {
	id: string;
	type: AuditEventType;
	resourceType: AuditResourceType;
	resourceId: string;
	relatedSubscriptionId?: string;
	payload: unknown;
	createdAt: string;
}

export function formatRelativeTime(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const diffSec = Math.round(diffMs / 1000);
	if (diffSec < 60) return "just now";
	const diffMin = Math.round(diffSec / 60);
	if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
	const diffHour = Math.round(diffMin / 60);
	if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
	const diffDay = Math.round(diffHour / 24);
	return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

export function payloadPreview(payload: unknown): string {
	const str = JSON.stringify(payload);
	return str.length > 80 ? `${str.slice(0, 80)}…` : str;
}

export const auditEvents: AuditEvent[] = [
	{
		id: "evt_01",
		type: "subscription.activated",
		resourceType: "subscription",
		resourceId: "sub_01",
		relatedSubscriptionId: "sub_01",
		payload: {
			subscription_id: "sub_01",
			plan_id: "plan_01",
			customer_email: "ada.eze@example.com",
			status: "active",
		},
		createdAt: "2026-07-01T06:10:00.000Z",
	},
	{
		id: "evt_02",
		type: "payment.succeeded",
		resourceType: "invoice",
		resourceId: "inv_09",
		relatedSubscriptionId: "sub_12",
		payload: {
			invoice_id: "inv_09",
			amount_kobo: 250_000,
			currency: "NGN",
			card_brand: "Mastercard",
		},
		createdAt: "2026-07-01T05:40:00.000Z",
	},
	{
		id: "evt_03",
		type: "payment.failed",
		resourceType: "invoice",
		resourceId: "inv_09",
		relatedSubscriptionId: "sub_05",
		payload: { invoice_id: "inv_09", reason: "insufficient_funds", attempt: 2 },
		createdAt: "2026-07-01T02:20:00.000Z",
	},
	{
		id: "evt_04",
		type: "webhook.delivery.failed",
		resourceType: "webhook",
		resourceId: "del_03",
		payload: {
			delivery_id: "del_03",
			endpoint_id: "we_02",
			http_status: 500,
			attempts: 3,
		},
		createdAt: "2026-06-30T14:22:00.000Z",
	},
	{
		id: "evt_05",
		type: "subscription.past_due",
		resourceType: "subscription",
		resourceId: "sub_02",
		relatedSubscriptionId: "sub_02",
		payload: {
			subscription_id: "sub_02",
			plan_id: "plan_02",
			reason: "card_declined",
		},
		createdAt: "2026-06-29T14:20:00.000Z",
	},
	{
		id: "evt_06",
		type: "invoice.paid",
		resourceType: "invoice",
		resourceId: "inv_02",
		relatedSubscriptionId: "sub_03",
		payload: {
			invoice_id: "inv_02",
			amount_kobo: 1_200_000,
			plan_id: "plan_07",
		},
		createdAt: "2026-06-15T09:00:00.000Z",
	},
	{
		id: "evt_07",
		type: "plan.published",
		resourceType: "plan",
		resourceId: "plan_01",
		payload: {
			plan_id: "plan_01",
			name: "Growth",
			amount_kobo: 500_000,
			interval: "monthly",
		},
		createdAt: "2026-06-18T09:12:00.000Z",
	},
	{
		id: "evt_08",
		type: "customer.created",
		resourceType: "customer",
		resourceId: "cus_04",
		payload: {
			customer_id: "cus_04",
			email: "tunde.bakare@example.com",
			source: "checkout",
		},
		createdAt: "2026-06-21T09:00:00.000Z",
	},
	{
		id: "evt_09",
		type: "subscription.cancelled",
		resourceType: "subscription",
		resourceId: "sub_09",
		relatedSubscriptionId: "sub_09",
		payload: {
			subscription_id: "sub_09",
			plan_id: "plan_02",
			reason: "customer_requested",
		},
		createdAt: "2026-06-10T09:00:00.000Z",
	},
	{
		id: "evt_10",
		type: "subscription.expired",
		resourceType: "subscription",
		resourceId: "sub_10",
		relatedSubscriptionId: "sub_10",
		payload: { subscription_id: "sub_10", plan_id: "plan_07" },
		createdAt: "2026-05-20T09:00:00.000Z",
	},
	{
		id: "evt_11",
		type: "webhook.delivery.succeeded",
		resourceType: "webhook",
		resourceId: "del_01",
		payload: {
			delivery_id: "del_01",
			endpoint_id: "we_01",
			http_status: 200,
			duration_ms: 184,
		},
		createdAt: "2026-06-30T09:12:01.000Z",
	},
	{
		id: "evt_12",
		type: "subscription.paused",
		resourceType: "subscription",
		resourceId: "sub_08",
		relatedSubscriptionId: "sub_08",
		payload: { subscription_id: "sub_08", plan_id: "plan_08" },
		createdAt: "2026-06-19T09:00:00.000Z",
	},
	{
		id: "evt_13",
		type: "invoice.void",
		resourceType: "invoice",
		resourceId: "inv_13",
		relatedSubscriptionId: "sub_10",
		payload: {
			invoice_id: "inv_13",
			amount_kobo: 1_200_000,
			voided_by: "system",
		},
		createdAt: "2026-05-19T09:00:00.000Z",
	},
	{
		id: "evt_14",
		type: "plan.archived",
		resourceType: "plan",
		resourceId: "plan_06",
		payload: { plan_id: "plan_06", name: "Legacy Basic" },
		createdAt: "2025-11-02T10:15:00.000Z",
	},
	{
		id: "evt_15",
		type: "subscription.resumed",
		resourceType: "subscription",
		resourceId: "sub_06",
		relatedSubscriptionId: "sub_06",
		payload: { subscription_id: "sub_06", plan_id: "plan_11" },
		createdAt: "2026-06-01T09:00:00.000Z",
	},
];
