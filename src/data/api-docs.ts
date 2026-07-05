export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ApiEndpoint {
	method: HttpMethod;
	path: string;
	summary: string;
	description?: string;
	requestExample?: string;
	responseExample?: string;
}

export interface ApiResourceGroup {
	id: string;
	title: string;
	description: string;
	endpoints: ApiEndpoint[];
}

export interface WebhookEventDef {
	type: string;
	category: string;
	description: string;
	payloadExample: string;
	status?: "pending";
}

export const apiBaseUrl = "https://api.subpilot.dev";

export const apiResourceGroups: ApiResourceGroup[] = [
	{
		id: "plans",
		title: "Plans",
		description:
			"Model billing offers and publish them as hosted checkout links. Amounts are always in kobo.",
		endpoints: [
			{
				method: "GET",
				path: "/v1/plans",
				summary: "List plans",
				responseExample: `{
  "data": [
    {
      "id": "01JAXQ2K9J6VZC3R7WQXQK5N8P",
      "name": "Growth Plan",
      "slug": "growth-plan",
      "description": "For teams past their first 100 customers.",
      "amount": 500000,
      "currency": "NGN",
      "billingInterval": "monthly",
      "trialDays": 14,
      "prorationPolicy": "credit",
      "status": "published",
      "hostedUrl": "https://pay.subpilot.dev/acme-corp/growth-plan",
      "createdAt": "2025-06-01T09:00:00Z"
    }
  ]
}`,
			},
			{
				method: "POST",
				path: "/v1/plans",
				summary: "Create a plan",
				description:
					"New plans are created in draft and don't accept subscriptions until published.",
				requestExample: `{
  "name": "Growth Plan",
  "description": "For teams past their first 100 customers.",
  "amount": 500000,
  "currency": "NGN",
  "billingInterval": "monthly",
  "trialDays": 14,
  "prorationPolicy": "credit"
}`,
				responseExample: `{
  "id": "01JAXQ2K9J6VZC3R7WQXQK5N8P",
  "name": "Growth Plan",
  "slug": "growth-plan",
  "status": "draft",
  "hostedUrl": null,
  "createdAt": "2025-06-01T09:00:00Z"
}`,
			},
			{
				method: "GET",
				path: "/v1/plans/:id",
				summary: "Get a plan",
			},
			{
				method: "PATCH",
				path: "/v1/plans/:id",
				summary: "Update a plan",
				description:
					"Only name, description, and trialDays can be changed after creation — pricing and interval are immutable once a plan has subscribers.",
				requestExample: `{ "trialDays": 30 }`,
			},
			{
				method: "POST",
				path: "/v1/plans/:id/publish",
				summary: "Publish a plan",
				description:
					"Generates the hosted checkout URL and makes the plan subscribable.",
				responseExample: `{
  "id": "01JAXQ2K9J6VZC3R7WQXQK5N8P",
  "status": "published",
  "hostedUrl": "https://pay.subpilot.dev/acme-corp/growth-plan"
}`,
			},
			{
				method: "POST",
				path: "/v1/plans/:id/archive",
				summary: "Archive a plan",
				description:
					"Stops new subscriptions. Existing subscribers are unaffected.",
				responseExample: `{ "id": "01JAXQ2K9J6VZC3R7WQXQK5N8P", "status": "archived" }`,
			},
		],
	},
	{
		id: "checkout",
		title: "Checkout",
		description:
			"Public, unauthenticated endpoints your customer-facing app can call directly — no API key required. A subscription is created by driving a customer through checkout, not by calling a subscriptions-create endpoint directly.",
		endpoints: [
			{
				method: "GET",
				path: "/v1/public/plans/:merchantSlug/:planSlug",
				summary: "Fetch public plan details",
				responseExample: `{
  "name": "Growth Plan",
  "description": "For teams past their first 100 customers.",
  "amount": 500000,
  "currency": "NGN",
  "billingInterval": "monthly",
  "trialDays": 14
}`,
			},
			{
				method: "POST",
				path: "/v1/public/plans/:merchantSlug/:planSlug/checkout",
				summary: "Start checkout",
				description:
					"Returns a hosted Nomba checkout URL. On completion, Nomba tokenises the card and SubPilot activates the subscription — you'll hear about it via the subscription.activated webhook.",
				responseExample: `{ "checkoutUrl": "https://checkout.nomba.com/pay/session_abc123" }`,
			},
		],
	},
	{
		id: "subscriptions",
		title: "Subscriptions",
		description:
			"Read subscription state and drive the lifecycle — cancel, pause, resume, or change plan with proration.",
		endpoints: [
			{
				method: "GET",
				path: "/v1/subscriptions",
				summary: "List subscriptions",
				description: "Supports `status` and `planId` query filters.",
				responseExample: `{
  "data": [
    {
      "id": "01JB2Q7X4H9K2M6NPRT8VQWY3Z",
      "customerId": "01JB1F3D8K6H2N4PQRT7VWXY2Z",
      "planId": "01JAXQ2K9J6VZC3R7WQXQK5N8P",
      "status": "active",
      "currentPeriodStart": "2025-06-28T00:00:00Z",
      "currentPeriodEnd": "2025-07-28T00:00:00Z",
      "nextBillingDate": "2025-07-28T00:00:00Z",
      "cancelAtPeriodEnd": false
    }
  ]
}`,
			},
			{
				method: "GET",
				path: "/v1/subscriptions/:id",
				summary: "Get a subscription",
			},
			{
				method: "POST",
				path: "/v1/subscriptions/:id/cancel",
				summary: "Cancel a subscription",
				requestExample: `{ "reason": "customer_request", "immediate": false }`,
				responseExample: `{
  "id": "01JB2Q7X4H9K2M6NPRT8VQWY3Z",
  "status": "active",
  "cancelAtPeriodEnd": true
}`,
			},
			{
				method: "POST",
				path: "/v1/subscriptions/:id/pause",
				summary: "Pause a subscription",
				responseExample: `{
  "id": "01JB2Q7X4H9K2M6NPRT8VQWY3Z",
  "status": "paused",
  "pausedAt": "2025-06-28T12:00:00Z"
}`,
			},
			{
				method: "POST",
				path: "/v1/subscriptions/:id/resume",
				summary: "Resume a paused subscription",
				responseExample: `{ "id": "01JB2Q7X4H9K2M6NPRT8VQWY3Z", "status": "active" }`,
			},
			{
				method: "POST",
				path: "/v1/subscriptions/:id/change-plan",
				summary: "Change plan with proration",
				description:
					"Returns the authoritative proration breakdown computed by the backend — always confirm with the caller before treating netChargeToday as final.",
				requestExample: `{ "newPlanId": "01JC3R8Y5J1L3N7QRSU9WXZ4A" }`,
				responseExample: `{
  "subscriptionId": "01JB2Q7X4H9K2M6NPRT8VQWY3Z",
  "previousPlanId": "01JAXQ2K9J6VZC3R7WQXQK5N8P",
  "newPlanId": "01JC3R8Y5J1L3N7QRSU9WXZ4A",
  "cycleDays": 30,
  "unusedDays": 12,
  "creditAmount": 200000,
  "newPlanProrated": 320000,
  "netChargeToday": 120000,
  "netCreditForward": 0,
  "chargedImmediately": true
}`,
			},
		],
	},
	{
		id: "customers",
		title: "Customers",
		description:
			"Read-only access to the customers attached to your subscriptions.",
		endpoints: [
			{
				method: "GET",
				path: "/v1/customers",
				summary: "List customers",
			},
			{
				method: "GET",
				path: "/v1/customers/:id",
				summary: "Get a customer",
				responseExample: `{
  "id": "01JB1F3D8K6H2N4PQRT7VWXY2Z",
  "fullName": "Ada Obi",
  "email": "ada@example.com",
  "phone": "+2348012345678",
  "cardLast4": "4242",
  "cardBrand": "verve",
  "createdAt": "2025-05-14T10:00:00Z"
}`,
			},
		],
	},
	{
		id: "invoices",
		title: "Invoices",
		description:
			"Every billing period generates an invoice, split into gross, platform fee, and net.",
		endpoints: [
			{
				method: "GET",
				path: "/v1/invoices",
				summary: "List invoices",
			},
			{
				method: "GET",
				path: "/v1/invoices/:id",
				summary: "Get an invoice",
				responseExample: `{
  "id": "01JD4S9Z6K2M4P8QRTV0XYZ5B",
  "invoiceNumber": "INV-042",
  "subscriptionId": "01JB2Q7X4H9K2M6NPRT8VQWY3Z",
  "amount": 500000,
  "currency": "NGN",
  "status": "paid",
  "platformFeeAmount": 10000,
  "netAmount": 490000,
  "periodStart": "2025-06-28T00:00:00Z",
  "periodEnd": "2025-07-28T00:00:00Z",
  "paidAt": "2025-06-28T12:01:00Z"
}`,
			},
			{
				method: "POST",
				path: "/v1/invoices/:id/void",
				summary: "Void an invoice",
				responseExample: `{ "id": "01JD4S9Z6K2M4P8QRTV0XYZ5B", "status": "void" }`,
			},
			{
				method: "POST",
				path: "/v1/invoices/:id/refund",
				summary: "Refund an invoice",
				requestExample: `{ "amount": 500000, "reason": "customer_request" }`,
				responseExample: `{ "id": "01JD4S9Z6K2M4P8QRTV0XYZ5B", "status": "refunded" }`,
			},
		],
	},
	{
		id: "webhooks",
		title: "Webhook endpoints",
		description:
			"Register your own URL to receive real-time event deliveries — see the full event catalog below.",
		endpoints: [
			{
				method: "POST",
				path: "/v1/webhooks/endpoints",
				summary: "Register an endpoint",
				requestExample: `{
  "url": "https://api.yourapp.com/webhooks/subpilot",
  "description": "Production billing sync",
  "events": ["subscription.activated", "subscription.past_due", "invoice.paid"]
}`,
				responseExample: `{
  "id": "01JE5T0A7L3N5Q9RSUW1YZA6C",
  "url": "https://api.yourapp.com/webhooks/subpilot",
  "subscribedEvents": ["subscription.activated", "subscription.past_due", "invoice.paid"],
  "active": true,
  "createdAt": "2025-06-01T09:00:00Z"
}`,
			},
			{
				method: "GET",
				path: "/v1/webhooks/endpoints",
				summary: "List your endpoints",
			},
			{
				method: "DELETE",
				path: "/v1/webhooks/endpoints/:id",
				summary: "Remove an endpoint",
			},
			{
				method: "GET",
				path: "/v1/webhooks/deliveries",
				summary: "List delivery attempts",
				description:
					"Every attempt, including retries, with status and HTTP response code.",
				responseExample: `{
  "data": [
    {
      "id": "01JF6U1B8M4P6R0STVX2ZAB7D",
      "endpointId": "01JE5T0A7L3N5Q9RSUW1YZA6C",
      "eventId": "01JXYZ0000000000000000000",
      "status": "succeeded",
      "attemptCount": 1,
      "lastAttemptedAt": "2025-06-28T12:00:01Z"
    }
  ]
}`,
			},
		],
	},
	{
		id: "api-keys",
		title: "API keys",
		description:
			"Manage the credentials your own backend uses to call this API. Keys are shown in full only once, at creation.",
		endpoints: [
			{
				method: "GET",
				path: "/v1/settings/api-keys",
				summary: "List API keys",
				responseExample: `{
  "data": [
    {
      "id": "01JG7V2C9N5Q7S1TUW3ABC8E",
      "label": "Production backend",
      "prefix": "sk_live_subpilot_",
      "active": true,
      "lastUsedAt": "2025-07-01T08:12:00Z",
      "createdAt": "2025-05-01T09:00:00Z"
    }
  ]
}`,
			},
			{
				method: "POST",
				path: "/v1/settings/api-keys",
				summary: "Create an API key",
				requestExample: `{ "label": "Production backend" }`,
				responseExample: `{
  "id": "01JG7V2C9N5Q7S1TUW3ABC8E",
  "label": "Production backend",
  "prefix": "sk_live_subpilot_",
  "rawKey": "sk_live_subpilot_production_9f8a7b6c5d4e3f2a1b0c",
  "active": true,
  "createdAt": "2025-05-01T09:00:00Z"
}`,
			},
			{
				method: "DELETE",
				path: "/v1/settings/api-keys/:id",
				summary: "Revoke an API key",
				description:
					"Immediate and irreversible — any caller using this key starts getting 401s.",
			},
		],
	},
];

export const webhookEvents: WebhookEventDef[] = [
	{
		type: "plan.created",
		category: "Plan",
		description: "A plan was created in draft state.",
		payloadExample: `{ "planId": "01J...", "name": "Pro Monthly", "amount": 500000, "billingInterval": "monthly", "status": "draft" }`,
	},
	{
		type: "plan.published",
		category: "Plan",
		description:
			"A plan moved from draft to published and got a hosted checkout URL.",
		payloadExample: `{ "planId": "01J...", "name": "Pro Monthly", "hostedUrl": "https://checkout.nomba.com/..." }`,
	},
	{
		type: "plan.archived",
		category: "Plan",
		description: "A plan was archived and stopped accepting new subscriptions.",
		payloadExample: `{ "planId": "01J...", "name": "Pro Monthly" }`,
	},
	{
		type: "subscription.created",
		category: "Subscription",
		description: "A subscription record was created, pre-checkout.",
		payloadExample: `{ "subscriptionId": "01J...", "planId": "01J...", "customerId": "01J...", "status": "trialing" }`,
	},
	{
		type: "subscription.activated",
		category: "Subscription",
		description:
			"The subscriber completed checkout, the card was tokenised, and billing is now live.",
		payloadExample: `{
  "subscriptionId": "01J...",
  "planId": "01J...",
  "customerId": "01J...",
  "status": "active",
  "currentPeriodStart": "2025-06-28T00:00:00Z",
  "currentPeriodEnd": "2025-07-28T00:00:00Z"
}`,
	},
	{
		type: "subscription.past_due",
		category: "Subscription",
		description:
			"The most recent renewal charge failed and dunning has started.",
		payloadExample: `{ "subscriptionId": "01J...", "invoiceId": "01J...", "failureReason": "insufficient_funds" }`,
	},
	{
		type: "subscription.paused",
		category: "Subscription",
		description: "The merchant paused billing on this subscription.",
		payloadExample: `{ "subscriptionId": "01J...", "pausedAt": "2025-06-28T12:00:00Z" }`,
	},
	{
		type: "subscription.resumed",
		category: "Subscription",
		description: "A paused subscription resumed normal billing.",
		payloadExample: `{ "subscriptionId": "01J...", "status": "active" }`,
	},
	{
		type: "subscription.cancelled",
		category: "Subscription",
		description:
			"The subscription was terminated, immediately or at period end.",
		payloadExample: `{ "subscriptionId": "01J...", "reason": "customer_request", "cancelledAt": "2025-06-28T12:00:00Z", "immediate": true }`,
	},
	{
		type: "subscription.expired",
		category: "Subscription",
		description: "A fixed-term subscription reached its end date.",
		payloadExample: `{ "subscriptionId": "01J...", "expiredAt": "2025-06-28T00:00:00Z" }`,
	},
	{
		type: "invoice.created",
		category: "Invoice",
		description: "An invoice was generated for a billing period.",
		payloadExample: `{
  "invoiceId": "01J...",
  "invoiceNumber": "INV-042",
  "subscriptionId": "01J...",
  "amount": 500000,
  "currency": "NGN",
  "periodStart": "2025-06-28T00:00:00Z",
  "periodEnd": "2025-07-28T00:00:00Z"
}`,
	},
	{
		type: "invoice.paid",
		category: "Invoice",
		description: "A charge succeeded and the invoice is now paid.",
		payloadExample: `{
  "invoiceId": "01J...",
  "invoiceNumber": "INV-042",
  "amount": 500000,
  "platformFeeAmount": 10000,
  "netAmount": 490000,
  "currency": "NGN",
  "paidAt": "2025-06-28T12:01:00Z"
}`,
	},
	{
		type: "payment.failed",
		category: "Payment",
		description: "A charge attempt was declined or timed out.",
		payloadExample: `{
  "paymentAttemptId": "01J...",
  "invoiceId": "01J...",
  "subscriptionId": "01J...",
  "amount": 500000,
  "failureCode": "card_declined",
  "failureReason": "Insufficient funds"
}`,
	},
	{
		type: "payment_attempt.succeeded",
		category: "Payment",
		description: "A charge attempt was confirmed by Nomba.",
		payloadExample: `{
  "paymentAttemptId": "01J...",
  "invoiceId": "01J...",
  "subscriptionId": "01J...",
  "amount": 500000,
  "nombaReference": "NMB-2025-XYZ"
}`,
	},
	{
		type: "dunning.started",
		category: "Dunning",
		description: "The first renewal charge failed and a retry campaign began.",
		payloadExample: `{ "dunningExecutionId": "01J...", "subscriptionId": "01J...", "invoiceId": "01J...", "campaignName": "Default Campaign", "maxAttempts": 4 }`,
	},
	{
		type: "dunning.recovered",
		category: "Dunning",
		description: "A retry charge succeeded — the subscription is active again.",
		payloadExample: `{ "dunningExecutionId": "01J...", "subscriptionId": "01J...", "invoiceId": "01J...", "recoveredAt": "2025-06-30T09:00:00Z", "stepNumber": 2 }`,
	},
	{
		type: "dunning.exhausted",
		category: "Dunning",
		description:
			"All retry steps ran out and the subscription was actioned (cancelled or expired).",
		payloadExample: `{ "dunningExecutionId": "01J...", "subscriptionId": "01J...", "invoiceId": "01J...", "outcome": "cancelled", "exhaustedAt": "2025-07-10T09:00:00Z" }`,
	},
	{
		type: "refund.created",
		category: "Refund",
		description: "A refund was initiated on a paid invoice.",
		payloadExample: `{ "refundId": "01J...", "invoiceId": "01J...", "amount": 500000, "currency": "NGN" }`,
		status: "pending",
	},
	{
		type: "refund.succeeded",
		category: "Refund",
		description: "Nomba confirmed the refund.",
		payloadExample: `{ "refundId": "01J...", "nombaRefundReference": "NMB-REF-XYZ", "amount": 500000 }`,
		status: "pending",
	},
	{
		type: "refund.failed",
		category: "Refund",
		description: "Nomba rejected the refund.",
		payloadExample: `{ "refundId": "01J...", "reason": "bank_rejected" }`,
		status: "pending",
	},
];
