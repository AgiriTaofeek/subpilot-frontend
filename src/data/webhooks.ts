export type WebhookEventType =
	| "subscription.activated"
	| "subscription.cancelled"
	| "subscription.past_due"
	| "subscription.paused"
	| "subscription.resumed"
	| "subscription.expired"
	| "invoice.paid"
	| "invoice.void"
	| "payment.succeeded"
	| "payment.failed";

export const eventTypeGroups: Array<{
	group: string;
	events: WebhookEventType[];
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
	{
		group: "Invoice",
		events: ["invoice.paid", "invoice.void"],
	},
	{
		group: "Payment",
		events: ["payment.succeeded", "payment.failed"],
	},
];

export interface WebhookEndpoint {
	id: string;
	url: string;
	description: string;
	events: WebhookEventType[];
	active: boolean;
	createdAt: string;
}

export function generateSigningSecret(): string {
	return `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
}

export const webhookEndpoints: WebhookEndpoint[] = [
	{
		id: "we_01",
		url: "https://api.acme-corp.com/webhooks/subpilot",
		description: "Production billing sync",
		events: [
			"subscription.activated",
			"subscription.cancelled",
			"subscription.past_due",
			"invoice.paid",
		],
		active: true,
		createdAt: "2026-05-01T09:00:00.000Z",
	},
	{
		id: "we_02",
		url: "https://staging.acme-corp.com/webhooks/subpilot",
		description: "Staging environment",
		events: ["payment.succeeded", "payment.failed"],
		active: true,
		createdAt: "2026-06-10T09:00:00.000Z",
	},
	{
		id: "we_03",
		url: "http://localhost:4000/webhooks",
		description: "Local dev testing",
		events: ["subscription.activated"],
		active: false,
		createdAt: "2026-06-20T09:00:00.000Z",
	},
];
