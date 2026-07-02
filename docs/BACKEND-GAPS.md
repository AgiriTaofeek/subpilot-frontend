# Backend Gaps

These are backend gaps that currently block parts of the frontend from being implemented cleanly.

## Gap 1 — Merchant Session Lifecycle Follow-Up

The backend now exposes the core cookie-auth pieces the frontend needed:

- `GET /v1/auth/me` for session bootstrap
- refresh-cookie support
- logout keyed off the refresh credential
- CSRF protection for cookie-authenticated merchant mutations

But live end-to-end verification uncovered one remaining blocker inside that
session model:

- a valid `_subpilot_session` cookie created by signup can still cause
  `GET /v1/auth/me` to return `500 internal_error`

That means Gap 1 is no longer blocking implementation of the frontend auth
surfaces, but it is still blocking a fully working live dashboard bootstrap.

The remaining backend auth cleanup is now narrower and is tracked in:

- `docs/backend-auth-follow-up.md`
- `docs/backend-phase-b-handoff.md`

## Gap 2 — Plan Response Omits Public-Link Fidelity

The frontend can now create, list, publish, and open hosted checkout links against the real backend.

Two plan-response gaps still force frontend workarounds:

- `PlanResponse.hostedUrl` is currently shaped like `/plans/{merchantSlug}/{planSlug}`, while the actual public checkout route in the frontend is `/pay/{merchantSlug}/{planSlug}`
- `PlanResponse` and `PublicPlanResponse` expose `billingInterval`, but not `intervalValue` / `intervalUnit`, so a true custom interval cannot be rendered faithfully after the plan is created

Why this matters:

- the frontend has to normalize the backend-hosted URL before copying or opening it
- custom intervals currently degrade to a generic "Custom interval" label after a round-trip through the backend

What the backend should ideally return:

- a `hostedUrl` that already points at `/pay/{merchantSlug}/{planSlug}`
- `intervalValue` and `intervalUnit` alongside `billingInterval` whenever the interval is custom

This does not block the tracer-bullet demo, but it does block exact parity between the form input and the persisted/displayed plan.

## Gap 3 — Portal Endpoints Return 500 on Every Request (root cause found)

All subscriber-facing portal endpoints return `500 internal_error` for every
request tried, including with a freshly-issued, valid subscription token.
Verified live (2026-07-02) against `GET /v1/portal/:token`,
`GET /v1/portal/:token/invoices`, and `GET /v1/portal/:token/available-plans`
— all three return `{"error":{"code":"internal_error", ...}}` with a
distinct `request_id` each time.

**Root cause, confirmed by reading `sub-pilot/src/main/java/co/subpilot/portal/controller/PortalController.java`:**
the class is mapped `@RequestMapping("/v1/portal/{subscriptionToken}")`, but
every single method binds the path variable with `@PathVariable String token`
— a name that doesn't match the URI template variable `subscriptionToken`,
and no explicit `@PathVariable("subscriptionToken")` is given either. Spring
MVC cannot resolve that argument at request time, so it throws before the
method body ever runs, on **every** method in the controller:

```java
@RequestMapping("/v1/portal/{subscriptionToken}")
public class PortalController {
    @GetMapping
    public ResponseEntity<PortalDtos.PortalSubscriptionView> getSubscription(@PathVariable String token) { ... }
    // getInvoices, cancel, updateCard, getAvailablePlans, changePlan — all the same mismatch
}
```

Fix: rename the parameter (or add an explicit name) in all six methods, e.g.
`@PathVariable("subscriptionToken") String token` or just
`@PathVariable String subscriptionToken`. This is a backend-only fix — no
frontend change is needed once it lands, since `src/lib/api/portal.ts` was
never built against the currently-broken shape. Written up as an actionable
item for the backend developer in `docs/backend-dev-todo.md`.

Impact: the merchant-facing dashboard is now fully wired to real data, but
`src/routes/portal.$token/*` remains on the pre-existing mock data
(`src/data/customers.ts`, `src/data/plans.ts`, `src/data/subscriptions.ts`
mock arrays) until this lands.

## Gap 4 — No Payment-Attempt Read Endpoint (Dunning Itself Is Real — See Below)

**Correction (2026-07-02, after reading `sub-pilot` source):** dunning is
*not* entirely missing — `co.subpilot.dunning.controller.DunningCampaignController`
exposes a real, working API for configuring the dunning *retry policy*:

- `GET /v1/dunning/campaigns` / `GET /v1/dunning/campaigns/{id}`
- `PATCH /v1/dunning/campaigns/{id}`
- `POST /v1/dunning/campaigns/{id}/steps`
- `PATCH /v1/dunning/campaigns/{id}/steps/{stepId}`
- `DELETE /v1/dunning/campaigns/{id}/steps/{stepId}`

This is campaign *configuration* (grace period, max attempts, whether to
cancel after exhaustion, and a list of steps — each a day-offset +
action `retry_charge|send_email|both` + optional email template) — not a
per-subscription attempt history. **Now wired** at Settings → Dunning
(`src/routes/_dashboard/settings/dunning.tsx`). Every merchant gets a
default campaign automatically on their first failed payment; a brand-new
merchant with zero failed payments will see an empty state until then.

What's still genuinely missing is a **per-subscription execution/attempt
history** (what the old mock `dunning.ts`/`payment-attempts.ts` UI showed —
`nextRetryAt`, per-attempt status/failure reason):

- `SubscriptionEntityDto` has no `nextRetryAt` or attempt-history field
- `InvoiceEntityDto` has no attempt-history field
- `co.subpilot.payment.entity.PaymentAttempt` and
  `co.subpilot.dunning.entity.DunningExecution` both exist as JPA entities
  with repositories, but neither has a controller — `PaymentAttemptRepository`
  is only ever read/written internally by `WebhookController` during Nomba
  payment-callback reconciliation, never exposed for the merchant to read
- the only externally-visible trace of dunning/payment-attempt activity is
  individual `AuditEventDto` rows (`DUNNING_STARTED`, `DUNNING_STEP_EXECUTED`,
  `PAYMENT_FAILED`, etc.) in `/v1/events`, which record that something
  happened but not a structured retry schedule or attempt list

Both UI sections (subscription detail's "Payment failed" card, invoice
detail's "Payment attempts" table) were removed rather than wired to
fabricated data. If a merchant needs this detail, the backend needs to
expose a real read endpoint over `PaymentAttempt`/`DunningExecution`.

## Gap 5 — Webhook Signing Secret UX (corrected — the secret IS retrievable)

**Correction (2026-07-02, after reading `sub-pilot` source):** an earlier
version of this doc claimed the webhook signing secret is unrecoverable
after creation, based on the field being named `signingSecretHash`. That
was wrong. Reading `co.subpilot.webhook.controller.WebhookController` and
`WebhookEndpoint` directly shows:

- `generateSecret()` produces a plain `SecureRandom` + Base64 token — it is
  **not hashed** anywhere before being stored
- the `signing_secret_hash` column stores that raw value verbatim
- `WebhookEndpoint` has no `@JsonIgnore`/custom serializer, so both
  `POST /v1/webhooks/endpoints` (creation) **and** every subsequent
  `GET /v1/webhooks/endpoints` (list) return the same real, usable secret in
  the `signingSecretHash` field

So despite the misleading field name, the secret is fully retrievable at any
time, not just once at creation — unlike `POST /v1/settings/api-keys`, which
genuinely does implement shown-once (`rawKey` is populated on creation only,
`null` on subsequent reads).

The frontend was updated to match this: the "endpoint registered" dialog now
presents the value as a real, usable signing secret, and a "View signing
secret" action was added to each endpoint's row menu so it can be retrieved
again later — not just shown once. See
`src/routes/_dashboard/webhooks/index.tsx`.

The backend field name (`signing_secret_hash` / `signingSecretHash`) is
still worth renaming or actually hashing at some point — returning a raw
secret on every list call is a mild security smell even though it's
functionally what the frontend needs today.

## Gap 6 — Two Real Backend Domains That Were Unwired (now wired)

Reading the full controller list in `sub-pilot` turned up two complete,
working domains that had no frontend consumer. Both are now wired.

**`/v1/analytics/*`** (`AnalyticsController`) — a proper MRR/analytics
dashboard backend (PRD §6.8), richer than the Overview/Revenue pages:

- `GET /v1/analytics/summary?rangeDays=30` — `mrr`, `activeSubscribers`,
  `churnRatePercent`, `paymentSuccessRatePercent`, `failedPaymentsCount`,
  `failedPaymentsValue`, `newSubscribersInRange`
- `GET /v1/analytics/charts/revenue?rangeDays=30&granularity=daily`
- `GET /v1/analytics/charts/subscription-growth?rangeDays=30&granularity=daily`
- `GET /v1/analytics/charts/payment-success-rate?rangeDays=30`
- `GET /v1/analytics/charts/dunning-recovery-rate?rangeDays=30`

**Now wired** as a new top-level nav item, `src/routes/_dashboard/analytics.tsx`.
Note the Revenue page's own chart is still derived client-side from the
invoice list (`dailyChartForWindow` in `src/data/revenue.ts`) rather than
switched over to `charts/revenue` — the two pages serve different purposes
(Revenue = SubPilot's fee/ledger view, Analytics = the merchant's own MRR
view) and were left as separate, intentionally.

**`/v1/audit-logs`** (`AuditLogController`) — a separate, richer audit trail
from the one already wired (`/v1/events`). Per the backend's own doc comment:
"Events record that a state change happened... AuditLog records WHO did it
and exactly WHAT changed" — it includes `actorId`, `actorType`
(`user`/`api_key`), and full `beforeSnapshot`/`afterSnapshot` JSON, filterable
server-side by `resourceType`+`resourceId` or `action`. This is a distinct,
legitimate feature (a compliance/change-log view) rather than a duplicate of
the Events page — `/v1/events` remains the right source for the Events
page's business timeline. **Now wired** at Settings → Audit log
(`src/routes/_dashboard/settings/audit-log.tsx`).
