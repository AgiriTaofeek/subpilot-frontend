# Hackathon Brief Alignment

This doc maps the hackathon prompt to what the SubPilot frontend must demonstrate.

The backend is the subscriptions engine. The frontend’s job is to expose that engine clearly: state machine visibility, dunning visibility, portal flows, webhook observability, and developer-facing ergonomics (API keys + docs).

---

## Hackathon Prompt (verbatim summary)

**Subscriptions Engine**
- Build a managed recurring-billing layer on top of Nomba's checkout and tokenised-card primitives for downstream product teams.

**Must include**
- Plan management
- Billing cycles (monthly, annual, custom)
- Proration
- Dunning and failed-payment recovery
- Customer self-service portal
- Webhooks for downstream systems

**Key APIs**
- Checkout API
- Tokenised cards
- Charge API
- Transfers

**Judged on**
- State-machine completeness
- Dunning sophistication
- Multi-tenant cleanliness
- API ergonomics for downstream developers

---

## What the Frontend Must Show (mapping)

| Hackathon requirement | What the product must do | What the frontend must show |
|---|---|---|
| Plan management | Merchant can create, publish, archive plans | Plan list, create form, publish action, hosted checkout URL |
| Billing cycles | Plans support monthly/annual/custom intervals | Interval selection UI plus clear display in plan + subscription |
| Proration | Upgrade/downgrade produces a proration breakdown | “Preview proration” view in dashboard and portal change-plan flows |
| Dunning & recovery | Failures move subscription into dunning, retries happen | Subscription detail dunning card + attempt history + next retry time |
| Customer portal | Subscriber can self-serve without a login | Portal overview, invoices, cancel-at-period-end, update-card, change plan |
| Webhooks | Downstream systems receive events reliably | Webhook endpoint CRUD UI + delivery logs + event audit log |
| Transfers | Payout/refund movement exists in the platform | Frontend should be explicit if payouts/refunds UI is deferred. Show fees/net read-only until payout endpoints exist. |

---

## Judging Criteria: How the Frontend Supports the Story

### State-machine completeness

Frontend proof:
- A single canonical status renderer (StatusBadge) for plan/subscription/invoice/payment states.
- A subscription state machine diagram on the subscription detail view showing valid transitions and current state.
- Clear modeling of asynchronous states (“activation pending” after checkout until webhook confirms).

### Dunning sophistication

Frontend proof:
- Dunning timeline card: step number, next retry date, history of attempts, and the last failure reason.
- “What happens next” guidance for operators (merchant).

### Multi-tenant cleanliness

Frontend proof:
- Dashboard is merchant-scoped via auth and never leaks cross-merchant data.
- Portal is scoped to exactly one subscription token and never imports dashboard API modules.
- Public checkout is unauthenticated but reads only published plan projections.

### API ergonomics for downstream developers

Frontend proof:
- API key management UX: create, list by prefix/label, revoke.
- Webhook registration UX: select event types, view deliveries, inspect errors.
- A minimal integration guide that shows how to verify signatures and which events to subscribe to.

