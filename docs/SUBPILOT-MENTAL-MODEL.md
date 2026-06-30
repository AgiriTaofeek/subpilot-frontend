# SubPilot — Complete Mental Model

This document explains what SubPilot is, who uses it, how it works end to end, and how all the moving parts fit together. Read this before touching any code.

---

## What SubPilot Is

SubPilot is **billing infrastructure**. It is the layer that handles recurring subscription payments so that other businesses do not have to build it themselves.

The closest analogy: Stripe handles raw payment processing so businesses do not have to build payment gateways. SubPilot handles subscription billing — plans, billing cycles, dunning, proration, customer portals — so businesses do not have to build any of that either.

SubPilot sits on top of Nomba's payment APIs (Checkout, Tokenised Cards, Charge, Transfers) and wraps them in a complete subscriptions engine.

---

## The Three Actors

### 1. The Merchant

A business that wants to charge customers on a recurring basis. Examples: a SaaS company, a gym, a newsletter, a digital agency offering retainer plans.

The merchant uses SubPilot to:

- Create subscription plans (price, billing interval, trial period)
- Share checkout links with their customers
- Monitor revenue, subscriptions, and failed payments from the dashboard
- Get paid out via Nomba Transfers

### 2. The Subscriber

The merchant's end customer — the person who pays a recurring fee. The subscriber never logs into SubPilot's merchant dashboard. They interact with SubPilot in two places only:

- The **checkout page** (to enter their details and pay the first time)
- The **self-service portal** (to cancel, change plan, or update their card)

### 3. The Downstream Developer

The merchant's own engineer who wants to integrate SubPilot programmatically into their product. Instead of using SubPilot's dashboard manually, they call SubPilot's REST API from their own backend using an API key. SubPilot becomes invisible — the merchant's product looks like it built everything itself.

---

## End-to-End Example: "Gymify"

Gymify is a gym management software company. They want to charge their gym clients ₦10,000/month. Here is exactly what happens.

---

### Step 1 — Gymify signs up to SubPilot

Gymify's owner goes to the SubPilot dashboard and signs up with their business name, email, and password.

What happens in the backend:

- A `Merchant` record is created with a unique `slug` (e.g. `gymify`)
- A `User` record is created and linked to the merchant
- A default `DunningCampaign` is created (4 retry steps: day 1, 3, 7, 14)
- The response includes a JWT `token` — Gymify's owner is now logged in

---

### Step 2 — Gymify creates a plan

Inside the SubPilot dashboard, Gymify creates a plan:

- Name: "Monthly Membership"
- Amount: ₦10,000 (10,000 kobo internally)
- Billing interval: Monthly
- Trial days: 0
- Proration policy: Credit

The plan starts in `draft` status. Gymify clicks **Publish**. SubPilot transitions the plan to `published` and generates a hosted checkout URL:

```
https://pay.subpilot.co/gymify/monthly-membership
```

Gymify copies this URL and puts it on their website, sends it via email, posts it on WhatsApp — however they reach their gym members.

---

### Step 3 — A subscriber checks out

A gym member clicks the link. They land on a SubPilot-hosted checkout page and enter their name, email, and phone number. They click Pay. SubPilot redirects them to a Nomba-hosted card entry page.

The gym member enters their card on Nomba's page. Nomba processes the payment, tokenises the card, and sends SubPilot a webhook: `POST /v1/webhooks/nomba` with event type `payment.success`.

SubPilot's webhook handler automatically:

1. Creates a `Customer` record for the gym member and stores their card token (`nombaCardTokenRef`)
2. Creates a `Subscription` record and transitions it from `trialing` → `active`
3. Creates the first `Invoice` and marks it `paid`
4. Captures SubPilot's platform fee and records the merchant's net amount
5. Dispatches a `subscription.activated` webhook to Gymify's registered endpoint
6. Sends a receipt email to the gym member
7. Sends a "new subscriber" alert email to Gymify

Gymify wrote zero billing code for any of this.

---

### Step 4 — Recurring billing runs automatically

Every night, SubPilot's billing engine scans all active subscriptions whose `nextBillingDate` has arrived. For each one:

1. Creates a new `Invoice` for the next period (idempotent — safe to run multiple times)
2. Calls Nomba's Charge API using the stored `nombaCardTokenRef`
3. Waits for Nomba's webhook response

**If payment succeeds:**

- Invoice moves to `paid`
- Platform fee is captured, net amount recorded
- `nextBillingDate` advances by one month
- `invoice.paid` webhook sent to Gymify

**If payment fails:**

- Invoice moves to `failed`
- Subscription moves to `past_due`
- Dunning campaign activates automatically (see Step 6)

Gymify does not need to run a cron job, write a billing loop, or think about retries. SubPilot handles all of it.

---

### Step 5 — Gymify monitors from the dashboard

Gymify's owner logs into the SubPilot dashboard and sees:

- **Overview:** active subscriber count, MRR, recent activity
- **Subscriptions:** list of all subscribers, status (active / past_due / cancelled), next billing date
- **Invoices:** every charge, paid/failed status, amounts
- **Revenue:** gross revenue, platform fees, net payout, fee ledger
- **Webhooks:** delivery log for every event sent to Gymify's system

---

### Step 6 — A payment fails and dunning kicks in

A gym member's card is declined. SubPilot automatically starts the dunning campaign:

| Day    | Action                                                   |
| ------ | -------------------------------------------------------- |
| Day 1  | Retry charge + send "payment failed" email to subscriber |
| Day 3  | Retry charge                                             |
| Day 7  | Retry charge + send "final warning" email                |
| Day 14 | Retry charge                                             |

If any retry succeeds:

- Subscription moves back to `active`
- `dunning.recovered` webhook sent to Gymify
- Recovery confirmation email sent to the subscriber

If all retries fail:

- Subscription moves to `cancelled` (or `expired`, depending on campaign config)
- `dunning.exhausted` webhook sent to Gymify
- Cancellation email sent to the subscriber

Gymify can customise the retry schedule and actions from the dashboard settings once Backend Gap 3 (dunning campaign configuration endpoints) is implemented. Until then, the default 4-step campaign is fixed.

---

### Step 7 — A subscriber updates their card or cancels

The subscriber receives an email with a link to their self-service portal. The URL contains a unique token — no password required.

In the portal the subscriber can:

- **Update card:** SubPilot calls Nomba's Checkout API to generate a new card entry URL. Nomba tokenises the new card and sends a webhook. SubPilot updates the stored `nombaCardTokenRef`.
- **Change plan:** SubPilot calculates proration (credit for unused days, charge for new plan), shows the subscriber a preview, and applies the change on confirmation.
- **Cancel:** Subscription is set to cancel at the end of the current billing period. It stays active and usable until then.

---

### Step 8 — Gymify requests a payout _(Backend Gap 2 — planned)_

SubPilot tracks the `netAmount` on every paid invoice (gross minus SubPilot's platform fee). When Backend Gap 2 is implemented, Gymify will click "Request Payout" in the Revenue dashboard. SubPilot will batch all undisbursed `netAmount` values and call Nomba's Transfers API to move the funds to Gymify's Nomba account.

Until this is built, the Revenue screen shows what Gymify has earned but no funds are transferred. The `netAmount` ledger is accurate — only the disbursement step is missing.

---

## The API Key — Downstream Developer Integration

This is the second way a merchant can use SubPilot, and it is the one most relevant to the hackathon's "API ergonomics for downstream developers" judging criterion.

### The scenario

Gymify has their own web app — a custom platform where gym owners manage their gyms and members pay for memberships. Gymify does not want to send their members to a SubPilot-branded checkout page. They want everything to happen inside Gymify's own app, looking like Gymify built it.

This is where the API key comes in.

---

### Step 1 — Get an API key from the SubPilot dashboard

Gymify's developer logs into the SubPilot dashboard, goes to **Settings → API Keys**, and creates a key with a label like "Production Backend".

SubPilot generates:

```
sk_live_a7f3d9e2b1c4...
```

This key is shown **once only** — SubPilot stores only the hash. Gymify's developer copies it and adds it to Gymify's own backend as an environment variable:

```bash
SUBPILOT_API_KEY=sk_live_a7f3d9e2b1c4...
```

---

### Step 2 — Gymify's backend calls SubPilot to create a plan

Instead of clicking "Create Plan" in the SubPilot dashboard, Gymify's developer does it programmatically from their own backend:

```http
POST https://api.subpilot.co/v1/plans
Authorization: Bearer sk_live_a7f3d9e2b1c4...
Content-Type: application/json

{
  "name": "Monthly Membership",
  "amount": 1000000,
  "currency": "NGN",
  "interval": "monthly"
}
```

SubPilot's `AuthFilter` sees the `sk_` prefix, hashes the token, looks it up in `ApiKeyRepository`, identifies Gymify's merchant account, and processes the request. The plan is created under Gymify's merchant account exactly as if they had done it from the dashboard.

---

### Step 3 — Gymify's frontend initiates a checkout

When a gym member signs up inside Gymify's own app, Gymify's backend calls SubPilot to start a checkout:

```http
POST https://api.subpilot.co/v1/public/plans/gymify/monthly-membership/checkout
Content-Type: application/json

{
  "customerName": "Ade Bello",
  "customerEmail": "ade@example.com",
  "customerPhone": "08012345678"
}
```

SubPilot responds with:

```json
{
  "subscriptionId": "sub_xyz...",
  "checkoutUrl": "https://checkout.nomba.com/pay/...",
  "checkoutReference": "ref_abc..."
}
```

Gymify redirects the gym member to the `checkoutUrl`. The member enters their card on Nomba's page. Nomba tokenises the card and fires a webhook back to SubPilot. SubPilot activates the subscription.

The gym member never sees "SubPilot" anywhere — they see Gymify's app until they land on Nomba's card entry page.

---

### Step 4 — Gymify's backend receives SubPilot webhooks

When SubPilot processes events (subscription activated, payment failed, dunning recovered), it sends signed webhook events to Gymify's registered endpoint:

```http
POST https://api.gymify.co/webhooks/subpilot
X-SubPilot-Signature: sha256=...

{
  "event": "subscription.activated",
  "subscriptionId": "sub_xyz...",
  "customerId": "cus_abc...",
  "merchantId": "mer_gymify...",
  "occurredAt": "2026-06-28T10:00:00Z"
}
```

Gymify's backend verifies the HMAC-SHA256 signature (using the signing secret from their registered endpoint), then updates its own database — for example, unlocking gym access for the member.

This is how Gymify knows, in real time, when a member has paid or when their subscription has lapsed.

---

### Step 5 — Gymify queries subscription data

At any point, Gymify's backend can query SubPilot for live subscription data:

```http
GET https://api.subpilot.co/v1/subscriptions?status=active
Authorization: Bearer sk_live_a7f3d9e2b1c4...
```

Or for a specific customer:

```http
GET https://api.subpilot.co/v1/customers/cus_abc.../subscriptions
Authorization: Bearer sk_live_a7f3d9e2b1c4...
```

This lets Gymify check whether a member's subscription is active before granting access to their gym.

---

### What this means in practice

From Gymify's perspective:

- SubPilot is invisible to their members
- Gymify's app controls the entire UX
- SubPilot handles all billing logic, retry logic, dunning, webhooks, and Nomba integration in the background
- Gymify's developer writes ~50 lines of integration code instead of building months of billing infrastructure

From SubPilot's perspective:

- Every API call is scoped to Gymify's merchant account via the API key
- `TenantContext.merchantId` is set automatically for every request — no data from other merchants is ever returned
- Multiple merchants can use SubPilot this way simultaneously with complete data isolation

---

### API key vs dashboard session — the key difference

|                     | Dashboard session                               | API key                                              |
| ------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| Used by             | Gymify's owner (a human, in a browser)          | Gymify's backend code (a server, automated)          |
| Initiated by        | Logging in with email + password                | Including `Authorization: Bearer sk_live_...` header |
| Credential location | Backend-owned `HttpOnly` cookies in the browser | Environment variable in Gymify's server              |
| Can be revoked      | By backend logout / clearing session            | By deleting the key from the dashboard               |
| Multiple allowed    | One active session at a time                    | Multiple API keys (e.g. staging + production)        |

Both paths go through the same `AuthFilter.java` and end in the same result: `TenantContext.merchantId` is set and the request is processed as belonging to that merchant.

---

## The Two Authentication Systems

This is the part that confuses most people. SubPilot has two completely separate auth surfaces for two completely different use cases.

### System 1 — Dashboard Web Session (backend-owned cookies)

**Who:** Gymify's owner logging into the SubPilot dashboard in a browser.

**How it works:**

1. Owner logs in through TanStack Start at `POST /v1/auth/login`
2. Backend validates password and sets secure merchant auth cookies
3. Backend returns safe merchant metadata
4. TanStack Start passes the backend cookies back to the browser
5. Every dashboard request sends those cookies to TanStack Start, and Start forwards them to the backend
6. Logout clears the backend-owned session via the logout endpoint and expires the cookies

**Security note:**
Cookie auth removes the need for JWT-in-JS as the main merchant auth model, but it raises the importance of CSRF protection for state-changing dashboard routes.

### System 2 — API Key (Bearer Token)

**Who:** Gymify's own developer calling SubPilot from Gymify's backend code.

**How it works:**

1. Gymify's developer goes to SubPilot dashboard → Settings → API Keys → Create Key
2. SubPilot generates a key: `sk_live_abc123...` (shown once, then only the hash is stored)
3. Gymify stores this key in their own backend environment variables
4. Gymify's backend calls SubPilot:
   ```
   POST https://api.subpilot.co/v1/subscriptions
   Authorization: Bearer sk_live_abc123...
   ```
5. SubPilot's `AuthFilter` sees the `sk_` prefix, looks up the hash in `ApiKeyRepository`, identifies the merchant, and proceeds

**Why API keys and not dashboard JWTs:**
Gymify's backend is not a browser, so it should not pretend to be one. API keys are the correct credential for programmatic access and they can be rotated without affecting human dashboard access.

### Side by side

|                   | Dashboard session                  | API key                               |
| ----------------- | ---------------------------------- | ------------------------------------- |
| Who uses it       | Merchant in a browser              | Developer's backend code              |
| Credential        | JWT Bearer token                   | `sk_live_...` Bearer token            |
| How it travels    | Frontend sets Authorization header | Developer sets Authorization header   |
| Where it's stored | Frontend auth store                | Developer's own environment variables |
| Managed by        | `AuthFilter` → JWT branch          | `AuthFilter` → `sk_` branch           |

Both paths go through the same `AuthFilter.java`. The filter reads `Authorization: Bearer ...`, then routes based on prefix: `sk_` is an API key, everything else is treated as a JWT. Both paths end in the same result: `TenantContext.merchantId` is set for the duration of the request.

---

## What Happens Without the Frontend

The entire backend is a REST API. Without the frontend:

| Scenario                                      | Works? | Notes                                                 |
| --------------------------------------------- | ------ | ----------------------------------------------------- |
| Technical merchant using the API directly     | ✅ Yes | Postman, curl, or their own code against the REST API |
| Browsing the full API surface                 | ✅ Yes | Swagger UI at `/swagger-ui.html`                      |
| Downstream developer integrating via API key  | ✅ Yes | This is the primary integration path                  |
| Non-technical merchant managing subscriptions | ❌ No  | They need the dashboard frontend                      |
| Subscriber completing checkout                | ❌ No  | Checkout form is a frontend page                      |
| Subscriber using the self-service portal      | ❌ No  | Portal is a frontend page                             |

For a hackathon demo, the Swagger UI is a legitimate demo surface for judges — it proves the full API works end to end without needing the dashboard built.

---

## The Data Model in Plain English

| Entity             | What it is                                                        |
| ------------------ | ----------------------------------------------------------------- |
| `Merchant`         | A business using SubPilot (e.g. Gymify)                           |
| `User`             | The person who logs into the dashboard (Gymify's owner)           |
| `Plan`             | A subscription product (e.g. "Monthly Membership, ₦10,000/month") |
| `Customer`         | A subscriber — their contact details and stored card token        |
| `Subscription`     | The ongoing relationship between a Customer and a Plan            |
| `Invoice`          | A billing record for one period of a Subscription                 |
| `PaymentAttempt`   | One charge attempt against a card for an Invoice                  |
| `DunningCampaign`  | A retry schedule (which days to retry, whether to email)          |
| `DunningExecution` | A live instance of a campaign running for one failed subscription |
| `WebhookEndpoint`  | A URL Gymify registered to receive SubPilot events                |
| `WebhookDelivery`  | A log record of one delivery attempt to one endpoint              |
| `ApiKey`           | A `sk_live_...` key for Gymify's developer to call the API        |
| `PlatformFee`      | A ledger entry recording SubPilot's cut of each paid invoice      |

---

## Subscription States

A subscription moves through these states in a defined order. Transitions that are not listed are not allowed.

```
trialing ──► active ──► past_due ──► active       (dunning recovered)
                    └──► past_due ──► cancelled    (dunning exhausted, cancel)
                    └──► past_due ──► expired      (dunning exhausted, no cancel)
                    └──► cancelled                 (merchant or subscriber cancels)
                    └──► paused                    (merchant pauses)
paused   ──► active                               (merchant resumes)
```

---

## Platform Fees

SubPilot takes a cut of every successful charge. The fee is configurable per merchant (basis points + fixed amount). It is captured at the moment a charge succeeds and stored on the `Invoice`:

- `invoice.amount` — gross amount charged to the subscriber
- `invoice.platformFeeAmount` — SubPilot's cut
- `invoice.netAmount` — what the merchant receives (`amount - platformFeeAmount`)

The `PlatformFee` ledger records every fee capture permanently. The Revenue dashboard reads from this ledger. Payout disbursement — transferring the accumulated `netAmount` to the merchant via Nomba Transfers — is Backend Gap 2 (planned). The ledger data is live and accurate; only the actual transfer step is not yet implemented.

---

## Nomba API Usage

SubPilot is built on four Nomba APIs:

| Nomba API           | Where SubPilot uses it                                                                                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Checkout API**    | Generating the hosted payment URL for new subscribers (Flow 3); generating card update URLs (Flow 8)                                                                                                                                    |
| **Tokenised Cards** | After checkout, Nomba includes a card token in the `payment.success` webhook. SubPilot stores this as `nombaCardTokenRef` on the `Customer`. Every future recurring charge uses this token — the subscriber never re-enters their card. |
| **Charge API**      | Charging the stored `nombaCardTokenRef` on every recurring renewal (Flow 4) and for immediate proration charges (Flow 6). This is `chargeToken()` in `NombaPaymentGateway`.                                                             |
| **Transfers API**   | Issuing refunds to subscribers (Backend Gap 1 — `initiateRefund()`); disbursing merchant net proceeds as payouts (Backend Gap 2 — planned).                                                                                             |

---

## How Webhooks Work (Both Directions)

### Inbound — Nomba → SubPilot

Nomba calls `POST /v1/webhooks/nomba` after every payment event. SubPilot verifies the HMAC-SHA256 signature, then updates Invoice/Subscription/Customer state accordingly. This is the trigger for everything that happens after a payment.

### Outbound — SubPilot → Merchant (Gymify)

When something significant happens (subscription activated, payment failed, dunning recovered, etc.), SubPilot POSTs a signed event payload to every endpoint Gymify has registered. Gymify's backend receives these webhooks and can update its own database, send its own notifications, or trigger its own workflows.

SubPilot retries failed deliveries with exponential backoff. Every delivery attempt is logged in `WebhookDelivery` and visible in the dashboard.

---

## Key Files for Each Domain

| Domain            | Key files                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Auth              | `auth/controller/AuthController.java`, `auth/security/AuthFilter.java`, `auth/security/JwtService.java`                                  |
| Plans             | `plan/controller/PlanController.java`, `plan/service/PlanService.java`                                                                   |
| Subscriptions     | `subscription/controller/SubscriptionController.java`, `subscription/service/SubscriptionService.java`, `subscription/StateMachine.java` |
| Billing engine    | `billing/BillingEngineService.java`, `billing/BillingSchedulerJob.java`                                                                  |
| Dunning           | `dunning/DunningTriggerService.java`, `dunning/DunningSchedulerJob.java`                                                                 |
| Payments          | `payment/PaymentService.java`                                                                                                            |
| Proration         | `proration/ProrationService.java`                                                                                                        |
| Customer portal   | `portal/controller/PortalController.java`                                                                                                |
| Webhooks          | `webhook/WebhookService.java`, `webhook/controller/WebhookController.java`                                                               |
| Nomba integration | `nomba/NombaPaymentGateway.java`, `nomba/service/NombaGatewayImpl.java`, `nomba/MockNombaGateway.java`                                   |
| Revenue / fees    | `fee/FeeService.java`, `fee/controller/FeeController.java`                                                                               |
| Multi-tenancy     | `common/tenant/TenantContext.java`                                                                                                       |
