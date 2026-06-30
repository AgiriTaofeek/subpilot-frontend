# Roadmap

Ship this in four phases.

The goal is not “all screens exist”. The goal is “the billing loop is real”: a merchant can publish a plan, a subscriber can pay, a webhook activates the subscription, and the merchant can see and manage that subscription.

Each phase is complete when:

- The user-visible success criteria pass.
- The test gates for the phase pass.
- A short walkthrough doc is written: `docs/milestone-N/README.md`.

---

## Phase 0 — Contracts + Scaffold (current)

**Scope:** Lock the contracts and build the minimum substrate to support a tracer-bullet flow.

### Contract freeze (backend-facing)

- [ ] Auth contract is explicit:
  - `POST /v1/auth/signup` and `POST /v1/auth/login` set backend-owned auth cookies and return safe merchant metadata
  - Dashboard requests flow `Browser -> TanStack Start -> backend`, with cookies forwarded server-side
  - `POST /v1/auth/refresh`, `POST /v1/auth/logout`, and `GET /v1/auth/me` are explicit
- [ ] Public checkout contract is explicit (`GET /v1/public/plans/:merchantSlug/:planSlug` and `POST /v1/public/plans/:merchantSlug/:planSlug/checkout`)
- [ ] Webhook-driven lifecycle expectations are explicit (states that are “eventually consistent” vs immediate)
- [ ] Backend dependency matrix is maintained in one place (what’s required now vs blocked)

### Frontend substrate

- [ ] TanStack Start scaffold is in place (non-demo route tree, working navigation shell)
- [ ] `.env.example` exists with `VITE_API_BASE_URL`
- [ ] Install and standardize the actual libraries the docs assume:
  - Axios, React Hook Form, Recharts
  - MSW for backend-client/server-function integration tests
- [ ] Typed backend client structure exists under `src/lib/backend/` and server functions exist under `src/lib/server/functions/`
- [ ] Merchant auth bootstrap exists via backend-owned cookies and `GET /v1/auth/me`
- [ ] Standard page states exist: loading, empty, error, forbidden, not found

### Test gates (Phase 0)

- [ ] Contract-level tests exist for auth response parsing and basic DTO parsing
- [ ] A single “smoke” test can start the app and render a route without crashing

---

## Phase 1 — Tracer Bullet (one real loop)

**Scope:** Prove the whole billing loop with the smallest set of screens.

### Screens

- [ ] `/auth/signup` and `/auth/login` (backend-owned cookie auth)
- [ ] `/overview` (can be simple, but must be real)
- [ ] `/plans/new` and `/plans/:id` (create and publish only)
- [ ] Public checkout page (first-class surface, not “later”):
  - `/pay/:merchantSlug/:planSlug` or equivalent route aligned with how the backend serves plan info
- [ ] `/subscriptions` list (shows newly activated subscription)

### Success criteria (Phase 1)

- [ ] New merchant can sign up and land in the dashboard with backend-owned cookie auth flowing through TanStack Start
- [ ] Merchant can create and publish a plan and copy a hosted checkout URL
- [ ] Subscriber can complete checkout and the subscription becomes `active` via webhook
- [ ] Merchant sees the subscription appear in `/subscriptions` within 30 seconds

### Test gates (Phase 1)

- [ ] API modules have integration tests (MSW) for: signup/login, create plan, publish plan, list subscriptions
- [ ] One end-to-end smoke test covers: signup → create plan → publish → subscription appears
- [ ] Error UX is planned and tested for “webhook delayed” (pending state, not silent failure)

---

## Phase 2 — Merchant Operations (make it usable)

**Scope:** Everything a merchant needs to operate subscriptions when things go wrong.

This phase is where the hackathon judging criteria should become obvious in the UI:

- State-machine completeness (clear status + valid transitions)
- Dunning sophistication (retry timeline + failure reasons)
- Multi-tenant cleanliness (merchant-scoped data, no leaks)
- API ergonomics (webhooks, events, and key management are usable)

### Subscriptions

- [ ] Subscription detail page with clear status, dates, and next billing date
- [ ] State machine diagram and quick actions (cancel, pause/resume, change plan)
- [ ] Dunning card visible when `past_due` with step history and next retry date

### Invoices + Customers

- [ ] Invoice list + invoice detail (amounts: gross / fee / net in NGN)
- [ ] Customer list + customer detail (card last4/brand/expiry, subscriptions)

### Webhooks + Events

- [ ] Webhook endpoints: register, list, delete
- [ ] Delivery log and event audit log
- [ ] Explicit signature verification guidance for downstream devs

### Revenue (visibility, not payouts)

- [ ] Revenue summary and ledger (no disbursement actions until backend is ready)

### Success criteria (Phase 2)

- [ ] Merchant can identify a `past_due` subscription and understand what happens next
- [ ] Merchant can inspect invoice attempts and see accurate NGN formatting everywhere
- [ ] Merchant can register an endpoint and see deliveries logged

### Test gates (Phase 2)

- [ ] Integration tests cover: dunning-visible state, invoice formatting, webhook registration
- [ ] E2E covers: view subscription detail → cancel at period end

---

## Phase 3 — Portal + Integration Polish

**Scope:** Subscriber self-service, and the “downstream developer ergonomics” story is demo-ready.

### Portal

- [ ] `/portal/:token` overview (no dashboard session)
- [ ] `/portal/:token/invoices` history
- [ ] `/portal/:token/available-plans` view plus plan change with proration preview before confirm
- [ ] Cancel at period end only
- [ ] Update card redirects to Nomba checkout and returns correctly

### Integration polish

- [ ] API key management UX (create, list by prefix, revoke)
- [ ] A minimal “Gymify integration” doc page with:
  - webhook signature verification example
  - recommended event subscriptions for v1
  - “what to do on webhook lag” guidance

### Success criteria (Phase 3)

- [ ] Subscriber can view and manage subscription via portal without any dashboard credential
- [ ] Plan change preview clearly shows proration breakdown before applying
- [ ] A downstream developer can integrate via API key + webhooks with minimal confusion

### Test gates (Phase 3)

- [ ] E2E covers: portal open → cancel → status reflects cancel-at-period-end
- [ ] E2E covers: portal change plan preview → confirm (with mocked backend)

---

## Deferred (post-V1)

| Feature                         | Why deferred                                  |
| ------------------------------- | --------------------------------------------- |
| Refund initiation UI            | Blocked on backend Transfers refund endpoints |
| Merchant payout disbursement UI | Blocked on backend Transfers payout flow      |
| Dunning campaign configuration  | Blocked on backend dunning CRUD endpoints     |
| Multi-user merchant accounts    | Multiplies auth/permissions complexity        |
| Password change                 | Blocked on backend endpoint                   |
| Dark mode                       | Product decision                              |
| Mobile-optimised dashboard      | Design decision                               |
