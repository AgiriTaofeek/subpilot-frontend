import { queryOptions } from "@tanstack/react-query";

import { listWebhookEndpoints } from "#/lib/api/webhooks.ts";

export const eventTypeGroups: Array<{ group: string; events: string[] }> = [
	{
		group: "Plan",
		events: ["plan.created", "plan.published", "plan.archived"],
	},
	{
		group: "Subscription",
		events: [
			"subscription.created",
			"subscription.activated",
			"subscription.past_due",
			"subscription.paused",
			"subscription.resumed",
			"subscription.cancelled",
			"subscription.expired",
		],
	},
	{ group: "Invoice", events: ["invoice.created", "invoice.paid"] },
	{
		group: "Payment",
		events: ["payment.failed", "payment_attempt.succeeded"],
	},
	{
		group: "Dunning",
		events: ["dunning.started", "dunning.recovered", "dunning.exhausted"],
	},
	{
		group: "Refund",
		events: [
			"refund.created",
			"refund.succeeded",
			"refund.failed",
			"refund.rejected",
		],
	},
	{
		group: "Payout",
		events: ["payout.triggered", "payout.succeeded", "payout.failed"],
	},
];

export const webhookEndpointsListQueryOptions = () =>
	queryOptions({
		queryKey: ["webhook-endpoints"],
		queryFn: () => listWebhookEndpoints(),
		// Endpoint configuration, not operational data — merchants set this up
		// once and rarely touch it again.
		staleTime: 120_000,
	});
