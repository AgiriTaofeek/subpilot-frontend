# SubPilot

A managed recurring-billing engine built on top of Nomba's checkout and tokenised-card primitives — plan management, billing cycles, proration, dunning and failed-payment recovery, a customer self-service portal, and webhooks, so downstream product teams never have to build a subscriptions system from scratch.

This repo is the frontend: the merchant dashboard, the public checkout page, the customer self-service portal, and an internal admin console. It talks to a real Spring Boot backend (`sub-pilot/`, Java) — everything described here is wired against that live backend, not mock data.

---

## What it is

SubPilot gives product teams a complete subscription layer without rebuilding one from scratch. This frontend exposes that layer to three audiences:

- **Merchants**: configure plans, monitor subscriptions, manage webhooks, review revenue. Accessed through the SubPilot dashboard, with auth handled by backend-owned `HttpOnly` cookies forwarded through TanStack Start.
- **Subscribers**: manage their own subscription — cancel, change plan, update card — with no login. Accessed at `/portal/:token`, authenticated by an opaque token mailed to them at checkout.
- **SubPilot staff**: a separate internal admin console (`/internal/*`) for merchant approval, refund approval, platform fee overrides, and an audit log — its own auth, its own cookie, structurally isolated from the merchant-facing app.

---

## Tech stack

| Layer        | Tool                                    |
| ------------ | --------------------------------------- |
| Framework    | TanStack Start (Vite + TanStack Router) |
| Language     | TypeScript                              |
| UI           | shadcn/ui + Tailwind CSS                |
| Server state | TanStack Query                          |
| Forms        | TanStack Form + Zod                     |
| Data table   | TanStack Table                          |
| HTTP         | TanStack Start server functions (fetch) |
| Charts       | Recharts                                |
| Lint/format  | Biome                                   |

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- The SubPilot backend running at `http://localhost:8080` or the configured backend base URL

---

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The app starts at `http://localhost:3000`.

---

## Environment variables

| Variable            | Default                 | Purpose                   |
| ------------------- | ----------------------- | ------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | SubPilot backend base URL |

---

## Project structure

```text
src/
  routes/
    auth/                 Login and signup
    _dashboard/           Merchant console (plans, subscriptions, customers,
                           invoices, webhooks, revenue, settings)
    _internalGate/        Internal admin console (merchant approval, refunds,
                           fee overrides, audit log) — separate auth entirely
    portal.$token/         Customer self-service portal, no login
    pay.$merchantSlug.$planSlug.tsx   Public hosted checkout page
    _marketing/           Public marketing site
  components/
    ui/                   shadcn/ui primitives
    layout/               Dashboard shell, header, sidebar, status banners
    marketing/            Marketing page sections
  lib/
    api/                  Server functions per backend domain, wrapping the
                           Spring Boot API (auth, plans, subscriptions, etc.)
  data/                   TanStack Query options + shared display data
    (query keys, status labels/colors, etc.) per domain
  types/                  TypeScript interfaces mirroring backend DTOs
docs/                     Design docs and domain docs
sub-pilot/                The Spring Boot backend this app talks to
```

---

## How to navigate the app

Everything below is a real flow against the live backend — no mock data anywhere. Two browser sessions make the best demo: one as the merchant, one as the customer (a private/incognito window works).

**1. Sign up as a merchant** — `/auth/signup`. Give a business name, email, and password. You land on `/overview`, empty, with a "Publish your first plan" prompt. (New accounts start in an `under_review` state — you can still explore everything below; a persistent banner reflects the status.)

**2. Create and publish a plan** — `/plans/new`. Set a name, price, billing interval, and optional trial days. Save it, open it (`/plans/:id`), and click **Publish**. This generates a hosted checkout link — copy it.

**3. Check out as a customer** — paste the checkout link into a second, private browser window. This loads the public, unauthenticated checkout page, collects name/email/phone, and hands off to Nomba's hosted card page. On completion you're redirected back to a success page, and the customer receives an email with a link into their own **self-service portal** — no login, just that link.

**4. Watch the subscription land** — back in the merchant window, `/subscriptions` now shows the new subscription as `active`. Open it for the full picture: a live state-machine diagram of its lifecycle, current period, and history.

**5. Explore the rest of the merchant console**:
- `/customers` — every paying customer and their card on file
- `/invoices` — every charge, with platform fee vs. net breakdown
- `/settings/dunning` — configure the retry campaign for failed payments
- `/webhooks` and `/webhooks/deliveries` — register an endpoint, see signed delivery attempts
- `/settings/api-keys` — generate an `sk_live_...` key for server-to-server integration
- `/revenue` and `/analytics` — fees, net revenue, MRR, churn
- `/events` and `/settings/audit-log` — the full event/audit trail
- `/docs` — the in-app API reference for downstream developers integrating SubPilot headlessly

**6. Explore the customer portal** — open the link from the confirmation email (`/portal/:token`). No login: view subscription status, invoices, cancel, change plan (with a real proration preview), or update the card.

**7. Internal admin console** — `/internal/login`, a structurally separate app (its own auth, its own cookie) for SubPilot's own team: approve/suspend merchants, review the refund queue, adjust platform fees, browse the internal audit log. Requires internal-admin credentials, which aren't self-serve signup — provided separately from this README.

More detailed internal docs exist locally under `docs/` for our own reference, but aren't part of this submission.
