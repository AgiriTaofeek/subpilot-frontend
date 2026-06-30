# Product Requirements — SubPilot Frontend

## Problem

Nomba exposes payment primitives (checkout, tokenised cards, charge, transfers) but ships no managed subscription layer. Every product team that wants recurring billing rebuilds the same state machines, dunning logic, and customer self-service flows from scratch. SubPilot is that shared layer. This frontend makes SubPilot usable by two audiences without needing engineers to build UI for each deployment.

---

## Hackathon Alignment

This project is being evaluated as a subscriptions engine product. The backend is the engine, the frontend must make the engine legible and operable.

See [hackathon-brief.md](hackathon-brief.md) for the full mapping.

**Judged on (what the frontend must demonstrate clearly):**

- State-machine completeness: subscription status visibility, valid transitions, clear async states.
- Dunning sophistication: retries, next-step visibility, and failure reason clarity.
- Multi-tenant cleanliness: strict separation of merchant dashboard vs portal token vs public checkout.
- API ergonomics: API keys + webhooks UX plus a minimal integration guide for downstream teams.

---

## Users

### Merchant (primary)

A developer or product manager at a company that has deployed SubPilot as their billing backend. They need to:

- Configure subscription plans without writing code
- Monitor the health of their subscriber base
- Investigate payment failures and dunning outcomes
- Register webhook endpoints for their downstream systems
- Review revenue and platform fees
- Manage API keys for programmatic integrations

**Authentication:** JWT (dashboard) or API key (programmatic — not via this UI).

### Subscriber (secondary)

An end-customer of the Merchant who has an active subscription. They need to:

- See their current plan, status, and next billing date
- View past invoices
- Cancel their subscription
- Switch to a different plan (with proration preview)
- Update their payment card

**Authentication:** Subscription Token embedded in a portal URL — no login or account required.

---

## V1 Scope

### Merchant Dashboard

| Feature                 | Screens                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| Authentication          | Login, Signup                                                         |
| Plan management         | List, Create, Detail (edit / publish / archive)                       |
| Subscription management | List (filtered by status/plan), Detail (state, dunning card, actions) |
| Customer management     | List, Detail (card info, history)                                     |
| Invoice management      | List, Detail (amounts, payment attempts, void)                        |
| Webhook management      | Endpoints (register / list / delete), Delivery log                    |
| Events audit log        | List (filterable by type, subscription)                               |
| Revenue dashboard       | Summary KPIs, fee ledger, time-series chart                           |
| Settings                | API key management, account info                                      |

### Customer Self-Service Portal

| Feature               | Notes                                                     |
| --------------------- | --------------------------------------------------------- |
| Subscription overview | Status, plan name, next billing date, card on file        |
| Invoice history       | Amounts and statuses                                      |
| Cancel subscription   | At-period-end only (subscriber cannot cancel immediately) |
| Change plan           | With proration preview before confirming                  |
| Update card           | Redirect to Nomba checkout, returns to portal after       |

---

## Non-Goals (V1)

- **Refund initiation** — backend endpoint does not exist yet. Display `refunded` status only.
- **Merchant payout disbursements** — backend Transfers integration incomplete. Show `netAmount` in revenue view only.
- **Multi-user merchant accounts** — the backend supports one user per merchant in V1. Role management is deferred.
- **Dunning campaign configuration UI** — merchants cannot edit their dunning schedule through the UI in V1. The default campaign is set up programmatically.
- **Password change** — no backend endpoint exists. Display account info read-only.
- **Mobile-first design** — the dashboard is desktop-optimised. The portal is responsive.
- **Internationalisation** — NGN / English only in V1.
- **Dark mode** — deferred.

---

## Success Criteria

These are binary — each can be verified by following the steps in [architecture.md](architecture.md#verification).

1. A merchant can sign up, create a plan, publish it, and receive the hosted checkout URL — all from the dashboard without writing code.
2. A subscriber who completes checkout appears in the Subscriptions list with status `active` within 30 seconds.
3. A failed payment surfaces as `past_due` on the subscription detail page with the dunning campaign step visible.
4. A subscriber visiting `/portal/:token` can view their plan, see past invoices, and cancel their subscription.
5. A merchant can register a webhook endpoint, trigger a subscription event, and see the delivery in the delivery log.
6. All monetary values in the UI display as NGN (not kobo).
7. An unauthenticated user accessing any dashboard route is redirected to `/auth/login`.
8. A portal user cannot access any merchant dashboard route (the portal token grants no merchant permissions).

---

## Constraints

- The backend API base URL is configurable via `VITE_API_BASE_URL`. The frontend makes no assumption about where the backend is hosted.
- All financial amounts from the API are in kobo. The frontend converts them using a single shared utility.
- The portal is stateless from an auth perspective — the subscription token is in the URL, not in a cookie or localStorage.
- The merchant dashboard session is backend-owned cookie auth. The browser talks to TanStack Start, and TanStack Start forwards cookies to the backend for merchant-protected routes.
