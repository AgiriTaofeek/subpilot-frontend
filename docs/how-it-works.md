# How It Works

End-to-end mental models for every major flow in SubPilot. Read this to understand what happens when a user takes an action — step by step, from the browser to the backend and back.

---

## Flow 1 — Merchant onboarding

**Entry point:** `/auth/signup`

1. Merchant fills in business name, email, password.
2. Browser submits the signup form to TanStack Start with `{ businessName, email, password }`.
3. TanStack Start forwards the request to the backend auth endpoint.
4. Backend creates a `Merchant` record with a generated `slug`, a default `DunningCampaign`, and a `User` record. It sets secure auth cookies and returns safe merchant metadata.
5. TanStack Start passes the backend `Set-Cookie` headers back to the browser and redirects to `/overview`.

For all subsequent dashboard API calls (loading plans, subscriptions, invoices, etc.), the browser sends merchant auth cookies to TanStack Start, and TanStack Start forwards them to the backend.

**On logout:** Frontend calls a TanStack Start logout action, Start forwards the request to the backend logout endpoint, and the backend clears auth cookies.

**Note on API keys:** API keys (`sk_live_...`) use the same `Authorization: Bearer ...` header, but are intended for server-to-server calls, not the browser dashboard.

The overview page is empty at this point — no plans, no subscriptions. The primary CTA is "Create your first plan".

---

## Flow 2 — Creating and publishing a plan

**Entry point:** `/plans/new`

1. Merchant fills in the plan form: name, amount (NGN — frontend converts to kobo on submit), billing interval, optional trial days, proration policy, optional description.
2. Frontend sends `POST /v1/plans → CreatePlanRequest`. Backend creates the plan in `draft` status, returns `PlanResponse`.
3. Plan appears in the list with a `Draft` badge. The hosted checkout URL field is empty.
4. Merchant navigates to the plan detail page and clicks **Publish**.
5. Frontend sends `POST /v1/plans/:id/publish`. Backend transitions plan to `published`, generates the SubPilot-hosted checkout URL (e.g. `https://pay.subpilot.co/gymify/monthly-membership`).
6. Plan detail page reloads. The checkout URL is now visible with a copy button.
7. Merchant shares this URL with subscribers (email, website, etc.).

---

## Flow 3 — Subscriber checkout (new subscription)

**Entry point:** SubPilot-hosted checkout URL (shared by the merchant)

This flow happens _outside_ the dashboard — it is the subscriber's journey. There are two distinct pages involved: the SubPilot checkout form (name, email, phone) and the Nomba card entry page (card number). These are different URLs and different systems.

1. Subscriber visits the SubPilot-hosted plan URL. This resolves to `GET /v1/public/plans/:merchantSlug/:planSlug` — a public, unauthenticated endpoint that returns plan details.
2. Subscriber fills in their name, email, and phone on the SubPilot checkout page. Frontend sends `POST /v1/public/plans/:merchantSlug/:planSlug/checkout → CheckoutRequest`.
3. Backend creates a `Subscription` in `trialing` status, creates a `Customer` record, calls the Nomba Checkout API to generate a payment URL, returns `CheckoutInitResponse { subscriptionId, checkoutUrl, checkoutReference }`.
4. Subscriber is redirected to the Nomba checkout URL to enter card details.
5. Nomba processes the card, tokenises it, and calls SubPilot's inbound webhook: `POST /v1/webhooks/nomba` with event type `payment.success`.
6. SubPilot backend:
   - Stores the card token on the `Customer` record (`nombaCardTokenRef`, `cardLast4`, `cardBrand`, `cardExpiry`).
   - Creates the initial `Invoice` and marks it `paid`.
   - Transitions the `Subscription` from `trialing` to `active`.
   - Emits `SUBSCRIPTION_ACTIVATED` event.
   - Dispatches `subscription.activated` webhook to all subscribed merchant endpoints.
   - Sends activation email to subscriber.
   - Sends new subscriber alert email to merchant.
7. Subscriber is returned to a confirmation page (or the merchant's success URL).
8. Merchant refreshes the subscriptions list — the new subscription appears with status `active`.

---

## Flow 4 — Subscription renewal (recurring billing)

**Triggered by:** Backend scheduled job (not a user action)

1. At `nextBillingDate`, the backend billing engine picks up all subscriptions due for renewal.
2. For each subscription, it creates a new `Invoice` for the current period (`createOrFind` — idempotent).
3. Backend calls `PaymentService.charge()` using the stored `nombaCardTokenRef`.
4. A `PaymentAttempt` is created in `pending` status.
5. Nomba processes the charge and calls `POST /v1/webhooks/nomba`.

**If payment.success:**

- `PaymentAttempt` moves to `succeeded`.
- `Invoice` moves to `paid`. Platform fee is captured.
- `Subscription.nextBillingDate` advances to the next period.
- `SUBSCRIPTION_RENEWED` event emitted.
- `invoice.paid` webhook dispatched to merchant.

**If payment.failed:**

- `PaymentAttempt` moves to `failed`.
- `Invoice` moves to `failed`.
- `Subscription.status` transitions to `past_due`.
- `SUBSCRIPTION_PAST_DUE` + `DUNNING_STARTED` events emitted.
- Dunning flow begins (see Flow 5).

---

## Flow 5 — Failed payment and dunning recovery

**Trigger:** A renewal charge fails.

The default dunning campaign has 4 retry steps at roughly day 1, 3, 7, and 14 after the initial failure.

1. `DunningExecution` is created with `status=active`, `currentStep=0`.
2. Subscription is `past_due`. Dashboard shows the dunning card on the subscription detail page.
3. A scheduled job runs hourly. For each active `DunningExecution`, it checks whether the next step's `dayOffset` has been reached.

**For each step:**

- If action is `retry_charge`: calls `PaymentService.charge()` again with the stored card token.
  - If it succeeds: `Invoice` marked `paid`, `DunningExecution` moves to `resolved`, `Subscription` transitions to `active`. `DUNNING_RESOLVED` event emitted. `dunning.recovered` webhook dispatched.
  - If it fails: step is recorded as failed, move to the next step.
- If action is `send_email`: sends the appropriate dunning email (payment_failed, dunning_warning, or final_warning).
- If action is `both`: charge attempt + email.

**When all steps are exhausted:**

- `DunningExecution` moves to `exhausted`.
- If `campaign.cancelAfterExhaustion = true`: Subscription transitions to `cancelled`.
- If `cancelAfterExhaustion = false`: Subscription transitions to `expired`.
- `DUNNING_EXHAUSTED` event emitted. `dunning.exhausted` webhook dispatched.
- Cancellation/suspension email sent to subscriber.
- Alert sent to merchant.

**Subscriber self-cure (portal):**
A subscriber can visit their portal, update their card (see Flow 8), and the next dunning step will attempt the new card. There is no "pay now" button in V1 — recovery happens via the scheduled retry.

---

## Flow 6 — Plan change with proration

**Entry points:**

- Merchant: Subscription detail → Change Plan → `/subscriptions/:id` (Change Plan modal)
- Subscriber: Customer portal → Plans tab → `/portal/:token/plans`

1. The requester selects a new plan.
2. Frontend sends `POST /v1/subscriptions/:id/change-plan → { newPlanId }` (merchant) or `POST /v1/portal/:token/change-plan → { newPlanId }` (subscriber).
3. Backend `ProrationService.changePlan()` calculates:
   - `cycleDays` = total days in current billing period
   - `unusedDays` = days remaining in current period
   - `fractionRemaining` = unusedDays / cycleDays
   - `creditAmount` = round(oldPlan.amount × fractionRemaining)
   - `newPlanProrated` = round(newPlan.amount × fractionRemaining)
   - `netChargeToday` = max(0, newPlanProrated - creditAmount)
   - `netCreditForward` = max(0, creditAmount - newPlanProrated)

**Proration policy effects:**

- `none`: plan changes at next cycle, no charge/credit. Response shows `takesEffectNextCycle=true`.
- `credit`: credit for unused days; on upgrade, charge the difference immediately.
- `charge`: same behaviour as `credit` for both upgrades and downgrades.

4. Backend returns `ChangePlanResponse` with the full financial breakdown.

**In the portal flow:** The frontend shows a proration preview screen with the breakdown before asking the subscriber to confirm. Only on confirmation does it POST to change-plan.

5. If `chargedImmediately=true`: backend charges the `netChargeToday` amount to the stored card and creates a proration invoice.
6. Subscription's `planId` is updated. Next renewal will use the new plan's amount.
7. `PRORATION_APPLIED` event emitted.

---

## Flow 7 — Subscription cancellation

**Entry points:**

- Merchant dashboard: Subscription detail → Cancel button → modal
- Customer portal: Overview → Cancel button → confirmation modal

**Two modes:**

### Immediate cancellation (merchant only)

1. Merchant selects "Cancel immediately" in the modal. Optionally provides a reason.
2. Frontend sends `POST /v1/subscriptions/:id/cancel → { reason, immediate: true }`.
3. Backend transitions `Subscription.status` to `cancelled` immediately.
4. `SUBSCRIPTION_CANCELLED` event emitted. `subscription.cancelled` webhook dispatched.
5. Cancellation email sent to subscriber. Alert sent to merchant.

### At-period-end cancellation (merchant or subscriber)

1. Requester selects "Cancel at end of billing period" (merchant) or simply confirms cancel (subscriber — portal always cancels at period end).
2. Frontend sends `POST /v1/subscriptions/:id/cancel → { immediate: false }` (merchant) or `POST /v1/portal/:token/cancel` (subscriber).
3. Backend sets `Subscription.cancelAtPeriodEnd = true`. Status remains `active` until period end.
4. Dashboard shows a "Cancels on [date]" indicator on the subscription.
5. At `currentPeriodEnd`, the billing engine sees `cancelAtPeriodEnd=true` and transitions to `cancelled` instead of billing for the next period.

---

## Flow 8 — Card update (subscriber)

**Entry point:** Customer portal → Overview → Update Card button

1. Subscriber clicks "Update Card".
2. Frontend sends `POST /v1/portal/:token/update-card`.
3. Backend calls the Nomba Checkout API to generate a new card update URL. Returns `PortalUpdateCardResponse { checkoutUrl, reference }`.
4. Frontend redirects the subscriber to the Nomba-hosted checkout URL.
5. Subscriber enters their new card. Nomba tokenises it and calls `POST /v1/webhooks/nomba` with `payment.success`.
6. Backend updates the `Customer` record with the new card token (`nombaCardTokenRef`, `cardLast4`, etc.).
7. Subscriber is returned to the portal. The card display shows the new last4.

---

## Flow 9 — Webhook endpoint registration and delivery

**Entry point:** Merchant dashboard → Webhooks → Register Endpoint

1. Merchant enters a URL, optional description, and selects which event types to receive.
2. Frontend sends `POST /v1/webhooks/endpoints → RegisterEndpointRequest`.
3. Backend creates a `WebhookEndpoint` with a generated `signingSecret`. The raw secret is returned to the merchant **once only** at creation time — they must copy it immediately and store it in their own backend environment variables. SubPilot stores only the hash.
4. Endpoint appears in the list. The signing secret is never shown again after this point.

**When an event occurs:**

1. Backend emits an internal `Event` record.
2. `WebhookService.dispatch()` is called for each active endpoint that subscribes to the event type.
3. Backend POSTs the event payload (signed with HMAC-SHA256) to the endpoint URL.
4. A `WebhookDelivery` record is created with the response status, body, and attempt count.
5. On non-2xx response or network error, the backend retries with exponential backoff.
6. Merchant can inspect deliveries at `/webhooks/deliveries`.

---

## Flow 10 — Merchant revenue review

**Entry point:** Merchant dashboard → Revenue

1. Frontend calls `GET /v1/fees/summary` → `FeeSummary` (total gross, fees, net for last 30 days).
2. Frontend calls `GET /v1/fees/rate` → `MerchantFeeRate` (basis points + fixed fee).
3. Frontend calls `GET /v1/fees/ledger` (paginated) → per-invoice fee breakdown.
4. Revenue page renders:
   - Three KPI cards: Gross Revenue, Platform Fees, Net Revenue (all in NGN).
   - Fee rate display: e.g., "1.5% + ₦50 per transaction".
   - Fee ledger table: invoice number, date, gross, fee, net.
   - Line chart: gross vs net over the last 30 days (data derived from the ledger).

**Note on "Net Revenue" vs "Payouts":** Net Revenue is what the merchant _earned_ after SubPilot's platform fees are deducted — it is a running total on the ledger. Actual payout disbursement (calling Nomba's Transfers API to move funds into the merchant's Nomba account) is a separate action and is tracked in Backend Gap 2. The Revenue screen shows what the merchant has earned; the Payouts screen (planned) is where they trigger and track the transfer of those funds.

---

## Flow 11 — Invoice refund via Transfers API

**Entry point:** Merchant dashboard → Invoices → Invoice detail → Refund

**Status: Planned — Backend Gap 1.** The gateway method exists (`NombaGatewayImpl.initiateRefund()`); the service layer and endpoint do not yet.

1. Merchant opens a paid invoice and clicks **Refund**.
2. A confirmation dialog shows the amount to be refunded.
3. Frontend sends `POST /v1/invoices/:invoiceId/refund`.
4. Backend `RefundService`:
   - Validates invoice is `paid` and belongs to this merchant.
   - Calls Nomba's Transfers API (`initiateRefund`) with the original Nomba reference and amount.
   - Persists a `Refund` record (status: `pending`).
   - Transitions `Invoice.status` to `refunded`.
   - Dispatches `refund.created` webhook to all subscribed merchant endpoints.
5. Nomba processes the refund and sends a webhook:
   - On success: `Refund` status → `succeeded`. `refund.succeeded` webhook dispatched.
   - On failure: `Refund` status → `failed`. `refund.failed` webhook dispatched.
6. Invoice detail page shows refund status chip (pending / succeeded / failed).

This is one of the four required Nomba APIs (Transfers). The webhook events (`refund.created`, `refund.succeeded`, `refund.failed`) are already defined in `WebhookEventCatalogue`.

---

## Flow 12 — Merchant payout disbursement via Transfers API

**Entry point:** Merchant dashboard → Revenue → Request Payout

**Status: Planned — Backend Gap 2.** The `Invoice.netAmount` ledger exists; the disbursement service and endpoint do not yet.

1. Merchant views their Net Revenue total on the Revenue page and clicks **Request Payout**.
2. A modal shows the total undisbursed net amount across all paid invoices since the last payout.
3. Merchant confirms. Frontend sends `POST /v1/payouts/trigger`.
4. Backend `DisbursementService`:
   - Queries all paid invoices not yet included in a disbursement.
   - Sums their `netAmount` values.
   - Calls Nomba's Transfers API to move the total to the merchant's Nomba account.
   - Persists a `Disbursement` record with the Nomba transfer reference, status, invoice count, and period covered.
5. Payout history table (below the fee ledger) shows the new payout row with status `pending` → `settled` as Nomba confirms.
6. Frontend can fetch `GET /v1/payouts` (list) and `GET /v1/payouts/:id` (detail with Nomba reference and settled timestamp).

This is the second use of the Transfers API and closes the full money lifecycle: subscriber pays → SubPilot collects fee → merchant receives net proceeds.

---

## Flow 13 — Downstream developer integration via API key

**Entry point:** Any merchant's backend or server-side code

This flow covers how a downstream product team integrates SubPilot into their own product using the API key. This is the judging criterion: "API ergonomics for downstream developers."

The scenario: a business (e.g. Gymify) wants SubPilot's billing engine to power their own product, with SubPilot invisible to their end users.

**Step 1 — Get an API key**

Gymify's developer logs into the SubPilot dashboard → Settings → API Keys → Create Key. SubPilot generates `sk_live_...` and shows it once. The developer stores it as an environment variable in Gymify's own backend.

**Step 2 — Create a plan via API**

```http
POST /v1/plans
Authorization: Bearer sk_live_a7f3d9e2b1c4...

{ "name": "Monthly Membership", "amount": 1000000, "currency": "NGN", "interval": "monthly" }
```

SubPilot's `AuthFilter` sees the `sk_` prefix, looks up the hash in `ApiKeyRepository`, resolves the merchant, sets `TenantContext.merchantId`, and proceeds. The plan is created under Gymify's account.

**Step 3 — Initiate a subscription checkout**

When a Gymify user wants to subscribe, Gymify's backend calls the public checkout endpoint (no API key needed — this is the subscriber's action):

```http
POST /v1/public/plans/gymify/monthly-membership/checkout

{ "customerName": "Ade Bello", "customerEmail": "ade@example.com", "customerPhone": "08012345678" }
```

SubPilot returns a `checkoutUrl` (Nomba-hosted card entry page). Gymify redirects their user there. After the user pays, Nomba sends a webhook to SubPilot → SubPilot activates the subscription → SubPilot sends a `subscription.activated` webhook to Gymify.

**Step 4 — Register a webhook endpoint**

```http
POST /v1/webhooks/endpoints
Authorization: Bearer sk_live_a7f3d9e2b1c4...

{ "url": "https://api.gymify.co/webhooks/subpilot", "events": ["subscription.activated", "subscription.cancelled", "invoice.paid", "dunning.exhausted"] }
```

SubPilot returns a `signingSecret` (shown once — Gymify stores it). Every subsequent SubPilot event is signed with HMAC-SHA256 using this secret. Gymify verifies the signature on every incoming webhook before processing it.

**Step 5 — Query subscription state**

```http
GET /v1/subscriptions?status=active
Authorization: Bearer sk_live_a7f3d9e2b1c4...
```

Gymify calls this before granting access to paid features, to confirm the subscriber's subscription is still active. All results are automatically scoped to Gymify's merchant account — no merchant filter needed in the query.

**Multi-tenancy guarantee:** Every API call authenticated with `sk_live_...` is silently scoped to the merchant that owns that key via `TenantContext`. A query for subscriptions only ever returns that merchant's subscriptions. Data from other merchants is never accessible.
