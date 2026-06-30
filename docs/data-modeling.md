# Data Modeling

TypeScript type definitions that mirror every backend DTO. These live in `src/types/` and are the single source of truth for data shapes in the frontend. API modules, components, and Zod schemas all derive from these.

All types are `interface` (not `type` alias) so they can be extended if needed. All optional backend fields are marked `?`.

---

## Conventions

- All monetary fields (`amount`, `feeAmount`, `netAmount`, etc.) are `number` in **kobo**. Display with `formatNGN()`.
- All timestamps are ISO 8601 strings (`string`) from the backend. Parse with `new Date()` or a date utility for display.
- All IDs are ULID strings (`string`).
- Paginated responses follow `PaginatedResponse<T>`.

---

## Shared

```ts
// src/types/shared.ts

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // current page (0-indexed)
  first: boolean;
  last: boolean;
}
```

---

## Auth

```ts
// src/types/auth.ts

export interface AuthResponse {
  token: string;
  merchantId: string;
  userId: string;
  email: string;
  businessName: string;
}

export interface ApiKeyResponse {
  id: string;
  label: string;
  prefix: string;
  rawKey?: string; // present only on creation, never again
  createdAt: string;
  lastUsedAt: string | null;
  active: boolean;
}
```

---

## Plans

```ts
// src/types/plan.ts

export type PlanStatus = "draft" | "published" | "archived";

export type BillingInterval =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

export type ProrationPolicy = "none" | "credit" | "charge";

export interface Plan {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  description: string | null;
  amount: number; // kobo
  currency: string; // 'NGN'
  billingInterval: BillingInterval;
  intervalValue: number | null;
  intervalUnit: string | null;
  trialDays: number;
  prorationPolicy: ProrationPolicy;
  status: PlanStatus;
  hostedUrl: string | null; // only set when published
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanRequest {
  name: string;
  description?: string;
  amount: number; // kobo
  currency?: string;
  billingInterval: BillingInterval;
  intervalValue?: number;
  intervalUnit?: string;
  trialDays?: number;
  prorationPolicy?: ProrationPolicy;
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  trialDays?: number;
}
```

---

## Subscriptions

```ts
// src/types/subscription.ts

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled"
  | "expired";

export interface Subscription {
  id: string;
  merchantId: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  cancellationReason: string | null;
  pausedAt: string | null;
  subscriptionToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface CancelSubscriptionRequest {
  reason?: string;
  immediate: boolean;
}

export interface ChangePlanRequest {
  newPlanId: string;
}

export interface CheckoutRequest {
  email: string;
  fullName: string;
  phone: string;
  merchantSlug: string;
  planSlug: string;
}

export interface CheckoutInitResponse {
  subscriptionId: string;
  checkoutUrl: string;
  checkoutReference: string;
}

export interface ChangePlanResponse {
  subscriptionId: string;
  previousPlanId: string;
  newPlanId: string;
  policy: ProrationPolicy;
  cycleDays: number;
  unusedDays: number;
  creditAmount: number; // kobo
  newPlanProrated: number; // kobo
  netChargeToday: number; // kobo
  netCreditForward: number; // kobo
  chargedImmediately: boolean;
  takesEffectNextCycle: boolean;
  paymentStatus: string | null;
}
```

---

## Customers

```ts
// src/types/customer.ts

export interface Customer {
  id: string;
  merchantId: string;
  fullName: string;
  email: string;
  phone: string | null;
  cardLast4: string | null;
  cardExpiry: string | null; // 'MM/YY'
  cardBrand: string | null; // 'Visa' | 'Mastercard' | ...
  createdAt: string;
  updatedAt: string;
}
```

---

## Invoices

```ts
// src/types/invoice.ts

export type InvoiceStatus = "pending" | "paid" | "failed" | "void" | "refunded";

export interface Invoice {
  id: string;
  merchantId: string;
  subscriptionId: string;
  customerId: string;
  invoiceNumber: string; // 'INV-001'
  amount: number; // kobo (gross)
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt: string | null;
  periodStart: string;
  periodEnd: string;
  prorationNote: string | null;
  platformFeeAmount: number; // kobo
  netAmount: number; // kobo
  feeBpsApplied: number | null;
  feeFixedApplied: number | null;
  nombaReference: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## Payment Attempts

```ts
// src/types/payment.ts

export type PaymentAttemptStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed";

export interface PaymentAttempt {
  id: string;
  merchantId: string;
  invoiceId: string;
  subscriptionId: string;
  provider: string;
  amount: number; // kobo
  currency: string;
  status: PaymentAttemptStatus;
  failureCode: string | null;
  failureReason: string | null;
  attemptedAt: string;
  resolvedAt: string | null;
}
```

---

## Dunning

```ts
// src/types/dunning.ts

export type DunningExecutionStatus =
  | "active"
  | "resolved"
  | "exhausted"
  | "cancelled";

export interface DunningExecution {
  id: string;
  merchantId: string;
  subscriptionId: string;
  invoiceId: string;
  campaignId: string;
  campaignName: string;
  currentStep: number;
  maxAttempts: number;
  status: DunningExecutionStatus;
  startedAt: string;
  resolvedAt: string | null;
}

export interface DunningStep {
  stepNumber: number;
  dayOffset: number;
  action: "retry_charge" | "send_email" | "both";
  executedAt: string | null;
  outcome: "succeeded" | "failed" | "pending" | null;
}
```

---

## Webhooks

```ts
// src/types/webhook.ts

export type WebhookDeliveryStatus = "pending" | "succeeded" | "failed";

export interface WebhookEndpoint {
  id: string;
  merchantId: string;
  url: string;
  description: string | null;
  subscribedEvents: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterEndpointRequest {
  url: string;
  description?: string;
  events: string[];
}

export interface WebhookDelivery {
  id: string;
  merchantId: string;
  endpointId: string;
  eventId: string;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  lastAttemptedAt: string | null;
  nextRetryAt: string | null;
  responseStatus: number | null;
  responseBody: string | null;
  createdAt: string;
}
```

---

## Events (Audit Log)

```ts
// src/types/event.ts

export type EventType =
  | "MERCHANT_CREATED"
  | "PLAN_CREATED"
  | "PLAN_UPDATED"
  | "PLAN_PUBLISHED"
  | "PLAN_ARCHIVED"
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_ACTIVATED"
  | "SUBSCRIPTION_RENEWED"
  | "SUBSCRIPTION_PAUSED"
  | "SUBSCRIPTION_RESUMED"
  | "SUBSCRIPTION_CANCELLED"
  | "SUBSCRIPTION_EXPIRED"
  | "SUBSCRIPTION_PAST_DUE"
  | "PAYMENT_INITIATED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "INVOICE_CREATED"
  | "INVOICE_PAID"
  | "INVOICE_VOIDED"
  | "DUNNING_STARTED"
  | "DUNNING_STEP_EXECUTED"
  | "DUNNING_RESOLVED"
  | "DUNNING_EXHAUSTED"
  | "DUNNING_RECOVERED"
  | "PRORATION_APPLIED"
  | "WEBHOOK_DELIVERED"
  | "WEBHOOK_FAILED"
  | "REFUND_CREATED"
  | "REFUND_SUCCEEDED"
  | "REFUND_FAILED";

export interface AuditEvent {
  id: string;
  merchantId: string;
  type: EventType;
  resourceType: string;
  resourceId: string;
  subscriptionId: string | null;
  payload: string; // JSON string — parse before display
  createdAt: string;
}
```

---

## Fees / Revenue

```ts
// src/types/fee.ts

export interface MerchantFeeRate {
  feeBps: number;
  feeFixedMinor: number; // kobo
  isOverride: boolean;
}

export interface FeeSummary {
  totalGrossAmount: number; // kobo
  totalFeeAmount: number; // kobo
  totalNetAmount: number; // kobo
  currency: string;
  periodStart: string;
  periodEnd: string;
}

export interface InvoiceFeeBreakdown {
  invoiceId: string;
  grossAmount: number; // kobo
  platformFeeAmount: number; // kobo
  netAmount: number; // kobo
  feeBps: number;
  feeFixed: number; // kobo
}
```

---

## Portal (Subscriber-facing, slim projections)

```ts
// src/types/portal.ts

export interface PortalSubscriptionView {
  subscriptionId: string;
  status: SubscriptionStatus;
  planName: string;
  billingInterval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  cardLast4: string | null;
  cardBrand: string | null;
  cardExpiry: string | null;
  amount: number; // kobo
  currency: string;
}

export interface PortalInvoiceView {
  invoiceNumber: string;
  amount: number; // kobo
  currency: string;
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  createdAt: string;
}

export interface PortalAvailablePlan {
  planId: string;
  name: string;
  amount: number; // kobo
  billingInterval: BillingInterval;
  intervalValue: number | null;
  intervalUnit: string | null;
}

export interface PortalCancelRequest {
  reason?: string;
}

export interface PortalUpdateCardResponse {
  checkoutUrl: string;
  reference: string;
}

export interface PortalChangePlanRequest {
  newPlanId: string;
}
```

---

## Webhook Event Catalogue (outbound events)

The full list of event type strings that merchants can subscribe to. Used for checkboxes in the webhook endpoint registration form.

```ts
// src/lib/constants/webhookEvents.ts

export const WEBHOOK_EVENT_CATALOGUE = [
  "plan.created",
  "plan.published",
  "plan.archived",
  "subscription.created",
  "subscription.activated",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.cancelled",
  "subscription.expired",
  "invoice.created",
  "invoice.paid",
  "payment.failed",
  "payment_attempt.succeeded",
  "dunning.started",
  "dunning.recovered",
  "dunning.exhausted",
  "refund.created",
  "refund.succeeded",
  "refund.failed",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_CATALOGUE)[number];
```
