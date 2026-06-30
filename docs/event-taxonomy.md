# Event Taxonomy

This document defines every event type, state enum value, and payload shape that crosses a boundary in SubPilot. It is the source of truth for:
- What status values components must render (including badge colours)
- What event types exist in the audit log
- What outbound webhook events merchants can subscribe to and what each payload looks like

---

## Status Enums and Badge Colours

### Subscription Status

| Value | Badge colour | Meaning |
|---|---|---|
| `trialing` | Blue | Free trial active, card collected but not charged |
| `active` | Green | Billing normally |
| `past_due` | Amber | Most recent charge failed, dunning in progress |
| `paused` | Gray | Billing suspended by merchant |
| `cancelled` | Red | Terminated — terminal state |
| `expired` | Gray | Fixed term ended — terminal state |

### Plan Status

| Value | Badge colour | Meaning |
|---|---|---|
| `draft` | Gray | Not yet accepting subscriptions |
| `published` | Green | Accepting new subscriptions |
| `archived` | Red | Deprecated, no new subscriptions |

### Invoice Status

| Value | Badge colour | Meaning |
|---|---|---|
| `pending` | Blue | Awaiting payment |
| `paid` | Green | Charge succeeded |
| `failed` | Red | All payment attempts failed |
| `void` | Gray | Voided by merchant |
| `refunded` | Purple | Reversed after payment (display only in V1) |

### Payment Attempt Status

| Value | Badge colour | Meaning |
|---|---|---|
| `pending` | Blue | Created, not yet sent |
| `processing` | Blue (animated) | Sent to Nomba, awaiting callback |
| `succeeded` | Green | Charge confirmed by Nomba |
| `failed` | Red | Declined or timed out |

### Dunning Execution Status

| Value | Badge colour | Meaning |
|---|---|---|
| `active` | Amber | Retries in progress |
| `resolved` | Green | Payment succeeded during retry |
| `exhausted` | Red | All retries failed, subscription actioned |
| `cancelled` | Gray | Manually cancelled |

### Webhook Delivery Status

| Value | Badge colour | Meaning |
|---|---|---|
| `pending` | Blue | Queued, not yet attempted |
| `succeeded` | Green | Delivered (2xx response) |
| `failed` | Red | Exhausted retries |

---

## Audit Event Types (Internal)

These appear in the `/events` audit log. The `type` field is one of these strings.

### Merchant Events

| Type | Trigger |
|---|---|
| `MERCHANT_CREATED` | New merchant account created |

### Plan Events

| Type | Trigger |
|---|---|
| `PLAN_CREATED` | Plan created in draft state |
| `PLAN_UPDATED` | Plan name, description, or trial days changed |
| `PLAN_PUBLISHED` | Plan moved from draft to published |
| `PLAN_ARCHIVED` | Plan archived |

### Subscription Events

| Type | Trigger |
|---|---|
| `SUBSCRIPTION_CREATED` | New subscription record created (pre-checkout) |
| `SUBSCRIPTION_ACTIVATED` | Subscriber completed checkout, card tokenised, subscription goes active |
| `SUBSCRIPTION_RENEWED` | Successful recurring charge at end of billing period |
| `SUBSCRIPTION_PAUSED` | Merchant paused the subscription |
| `SUBSCRIPTION_RESUMED` | Merchant resumed a paused subscription |
| `SUBSCRIPTION_CANCELLED` | Subscription cancelled (immediately or at period end) |
| `SUBSCRIPTION_EXPIRED` | Fixed-term subscription reached its end date |
| `SUBSCRIPTION_PAST_DUE` | Renewal charge failed, subscription marked past due |

### Payment Events

| Type | Trigger |
|---|---|
| `PAYMENT_INITIATED` | Charge request sent to Nomba gateway |
| `PAYMENT_SUCCEEDED` | Nomba confirmed charge success (via webhook) |
| `PAYMENT_FAILED` | Nomba confirmed charge failure (via webhook) |

### Invoice Events

| Type | Trigger |
|---|---|
| `INVOICE_CREATED` | Invoice record created for a billing period |
| `INVOICE_PAID` | Invoice marked paid after successful charge |
| `INVOICE_VOIDED` | Invoice voided by merchant |

### Dunning Events

| Type | Trigger |
|---|---|
| `DUNNING_STARTED` | First charge failed, dunning execution created |
| `DUNNING_STEP_EXECUTED` | A retry step ran (charge attempted or email sent) |
| `DUNNING_RESOLVED` | A retry charge succeeded, subscription returns to active |
| `DUNNING_EXHAUSTED` | All retry steps ran, subscription cancelled/expired |
| `DUNNING_RECOVERED` | Alias for resolved — payment recovered during dunning |

### Proration Events

| Type | Trigger |
|---|---|
| `PRORATION_APPLIED` | Plan changed mid-cycle, proration calculated and charged |

### Webhook Events

| Type | Trigger |
|---|---|
| `WEBHOOK_DELIVERED` | Outbound webhook delivery succeeded |
| `WEBHOOK_FAILED` | Outbound webhook delivery failed after retries |

### Refund Events

| Type | Trigger | Backend status |
|---|---|---|
| `REFUND_CREATED` | Refund initiated | Defined, not yet dispatched |
| `REFUND_SUCCEEDED` | Refund confirmed by Nomba | Defined, not yet dispatched |
| `REFUND_FAILED` | Refund rejected by Nomba | Defined, not yet dispatched |

---

## Outbound Webhook Events (Merchant-subscribed)

These are the event strings merchants use when registering webhook endpoints. Each is a public-facing alias for one or more internal `EventType` values.

### Payload envelope (all events)

```json
{
  "id": "01JXYZ...",
  "type": "subscription.activated",
  "merchantId": "01JABC...",
  "resourceType": "subscription",
  "resourceId": "01JDEF...",
  "subscriptionId": "01JDEF...",
  "createdAt": "2025-06-28T12:00:00Z",
  "data": { /* event-specific payload */ }
}
```

Headers on every delivery:
```
X-SubPilot-Signature: sha256=<hmac-hex>
X-SubPilot-Timestamp: 2025-06-28T12:00:00Z
Content-Type: application/json
```

### Plan Events

#### `plan.created`
```json
{
  "planId": "01J...",
  "name": "Pro Monthly",
  "amount": 500000,
  "billingInterval": "monthly",
  "status": "draft"
}
```

#### `plan.published`
```json
{
  "planId": "01J...",
  "name": "Pro Monthly",
  "hostedUrl": "https://checkout.nomba.com/..."
}
```

#### `plan.archived`
```json
{
  "planId": "01J...",
  "name": "Pro Monthly"
}
```

### Subscription Events

#### `subscription.created`
```json
{
  "subscriptionId": "01J...",
  "planId": "01J...",
  "customerId": "01J...",
  "status": "trialing"
}
```

#### `subscription.activated`
```json
{
  "subscriptionId": "01J...",
  "planId": "01J...",
  "customerId": "01J...",
  "status": "active",
  "currentPeriodStart": "2025-06-28T00:00:00Z",
  "currentPeriodEnd": "2025-07-28T00:00:00Z"
}
```

#### `subscription.past_due`
```json
{
  "subscriptionId": "01J...",
  "invoiceId": "01J...",
  "failureReason": "insufficient_funds"
}
```

#### `subscription.paused`
```json
{
  "subscriptionId": "01J...",
  "pausedAt": "2025-06-28T12:00:00Z"
}
```

#### `subscription.resumed`
```json
{
  "subscriptionId": "01J...",
  "status": "active"
}
```

#### `subscription.cancelled`
```json
{
  "subscriptionId": "01J...",
  "reason": "customer_request",
  "cancelledAt": "2025-06-28T12:00:00Z",
  "immediate": true
}
```

#### `subscription.expired`
```json
{
  "subscriptionId": "01J...",
  "expiredAt": "2025-06-28T00:00:00Z"
}
```

### Invoice Events

#### `invoice.created`
```json
{
  "invoiceId": "01J...",
  "invoiceNumber": "INV-042",
  "subscriptionId": "01J...",
  "amount": 500000,
  "currency": "NGN",
  "periodStart": "2025-06-28T00:00:00Z",
  "periodEnd": "2025-07-28T00:00:00Z"
}
```

#### `invoice.paid`
```json
{
  "invoiceId": "01J...",
  "invoiceNumber": "INV-042",
  "amount": 500000,
  "platformFeeAmount": 10000,
  "netAmount": 490000,
  "currency": "NGN",
  "paidAt": "2025-06-28T12:01:00Z"
}
```

### Payment Events

#### `payment.failed`
```json
{
  "paymentAttemptId": "01J...",
  "invoiceId": "01J...",
  "subscriptionId": "01J...",
  "amount": 500000,
  "failureCode": "card_declined",
  "failureReason": "Insufficient funds"
}
```

#### `payment_attempt.succeeded`
```json
{
  "paymentAttemptId": "01J...",
  "invoiceId": "01J...",
  "subscriptionId": "01J...",
  "amount": 500000,
  "nombaReference": "NMB-2025-XYZ"
}
```

### Dunning Events

#### `dunning.started`
```json
{
  "dunningExecutionId": "01J...",
  "subscriptionId": "01J...",
  "invoiceId": "01J...",
  "campaignName": "Default Campaign",
  "maxAttempts": 4
}
```

#### `dunning.recovered`
```json
{
  "dunningExecutionId": "01J...",
  "subscriptionId": "01J...",
  "invoiceId": "01J...",
  "recoveredAt": "2025-06-30T09:00:00Z",
  "stepNumber": 2
}
```

#### `dunning.exhausted`
```json
{
  "dunningExecutionId": "01J...",
  "subscriptionId": "01J...",
  "invoiceId": "01J...",
  "outcome": "cancelled",
  "exhaustedAt": "2025-07-10T09:00:00Z"
}
```

### Refund Events (backend pending)

#### `refund.created`
```json
{
  "refundId": "01J...",
  "invoiceId": "01J...",
  "amount": 500000,
  "currency": "NGN"
}
```

#### `refund.succeeded`
```json
{
  "refundId": "01J...",
  "nombaRefundReference": "NMB-REF-XYZ",
  "amount": 500000
}
```

#### `refund.failed`
```json
{
  "refundId": "01J...",
  "reason": "bank_rejected"
}
```

---

## UI Display Rules

### Monetary amounts

Always display `amount`, `platformFeeAmount`, `netAmount`, `creditAmount`, `netChargeToday`, `netCreditForward` using `formatNGN(kobo)`. Never display the raw integer.

### Timestamps

Display relative times ("2 hours ago") for recent events (< 24h). Display formatted dates ("28 Jun 2025, 12:01") for older events. Always show the full datetime on hover (tooltip).

### Event payload preview

In the audit log, the `payload` field is a raw JSON string. Parse it before display. Show a truncated key-value list in the table row. Show the full formatted JSON in a modal or expandable panel.

### Webhook event filtering

The webhook endpoint registration form must render checkboxes for all 20 event types in the catalogue. Group them by resource type (Plan, Subscription, Invoice, Payment, Dunning, Refund). Include a "Select all" toggle per group.
