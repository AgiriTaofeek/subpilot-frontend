# Backend Gaps

These are backend gaps that currently block parts of the frontend from being implemented cleanly.

## Gap 1 — Merchant Session Lifecycle Follow-Up (RESOLVED, verified 2026-07-02)

The backend now exposes the core cookie-auth pieces the frontend needed:

- `GET /v1/auth/me` for session bootstrap
- refresh-cookie support
- logout keyed off the refresh credential
- CSRF protection for cookie-authenticated merchant mutations

Live end-to-end verification had previously uncovered one remaining blocker:

- a valid `_subpilot_session` cookie created by signup could still cause
  `GET /v1/auth/me` to return `500 internal_error`

**Re-verified live on 2026-07-02** with a fresh signup → cookie jar →
`GET /v1/auth/me` round trip: the endpoint now returns `200` with the
correct merchant payload. No `500` reproduced. Whether this was a backend
fix or was actually caused by the frontend's own cookie-forwarding bug (also
fixed this session — see `forwardResponseCookies` in `src/lib/api/backend.ts`,
which was clobbering all but the last `Set-Cookie` header) is unclear, but
either way the full signup → session bootstrap → dashboard flow now works
end-to-end against the live backend. No further action needed here.

The remaining backend auth cleanup is now narrower and is tracked in:

- `docs/backend-auth-follow-up.md`
- `docs/backend-phase-b-handoff.md`

## Gap 2 — Plan Response Omits Public-Link Fidelity (still present, re-verified 2026-07-02)

The frontend can now create, list, publish, and open hosted checkout links against the real backend.

Re-checked live against a fresh plan (created with a `custom` interval,
`intervalValue: 3, intervalUnit: "weeks"`, then published): both issues
below still reproduce exactly as described — `hostedUrl` is still
`/plans/{slug}/{slug}`, and `intervalValue`/`intervalUnit` are absent
from every response (create, publish, and a plain `GET`), even though
they were sent on creation. Neither is fixed on the backend yet.

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

## Gap 3 — Portal Endpoints Return 500 on Every Request (RESOLVED, verified 2026-07-02)

All subscriber-facing portal endpoints previously returned `500 internal_error`
for every request tried, including with a freshly-issued, valid subscription
token, due to a `@PathVariable` name mismatch in `PortalController` (the
class-level `{subscriptionToken}` template variable didn't match the
per-method `@PathVariable String token` parameter name, so Spring MVC
couldn't resolve the argument and threw before any method body ran).

**Re-verified live on 2026-07-02:** `GET /v1/portal/{id}`,
`GET /v1/portal/{id}/invoices`, and `GET /v1/portal/{id}/available-plans`
all now return a proper `404 subscription_not_found` for an unknown/pending
ID (tested against both an arbitrary string and a real, freshly-created but
not-yet-paid `subscriptionId` from a live checkout) instead of `500
internal_error`. The argument-binding bug is fixed — the backend now reaches
its actual business logic instead of throwing before the method body runs.

**Frontend: now wired (2026-07-02).** `src/routes/portal.$token/*` (all 5
route files) and `src/lib/api/portal.ts` now call the real backend directly
— no more mock data. Exact request/response shapes were pulled from the
live OpenAPI spec (`GET /v3/api-docs`) and cross-checked against a real
active subscription (`GET /v1/portal/{subscriptionToken}` returns
`PortalSubscriptionView`; note the portal auth token is the subscription's
own `subscriptionToken` field, not its `id`). All 6 endpoints are wired:
the 3 GETs (subscription, invoices, available-plans) plus cancel,
change-plan, and update-card mutations. Verified live end-to-end via SSR
(`vite preview` + curl) against a real subscription and a real invalid
token — both the happy path and the "link no longer valid" fallback render
correctly with live data, no fabricated/mock content remains anywhere in
the portal.

Two customer actions from the old mock UI have no backend equivalent and
were removed rather than faked: undoing a scheduled cancellation, and
resuming a paused subscription from the customer's side (only `cancel`,
`change-plan`, and `update-card` mutations exist on `PortalController`).
The client-side proration preview (`src/lib/proration.ts`) was also removed
in favor of showing the backend's real computed proration numbers in a
toast after confirming a plan change — matching the same pattern already
used on the merchant dashboard's own change-plan flow.

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
