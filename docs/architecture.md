# Architecture

This is the “how it fits together” doc. It is written as target architecture, but it also calls out what is true today vs what is planned, so we do not confuse a design doc for implemented code.

See also: `docs/frontend-bff-architecture.md` for the recommended TanStack Start BFF model, `docs/backend-auth-architecture-request.md` for the backend-owned cookie contract that powers merchant web auth, and `docs/frontend-error-and-loading-strategy.md` for loading/error/timeout/eventual-consistency UX rules.

---

## Current State

Today, this repo is still a TanStack Start starter app with demo routes and no SubPilot domain implementation.

That is fine. The plan is to move from “starter” to “product” by proving one complete billing loop first (see `docs/roadmap.md`).

---

## One Frontend, Multiple Surfaces

SubPilot should be built as **one frontend application**, not separate websites/apps stitched together later.

That means:

- one TanStack Start app
- one shared design system (shadcn presets + project components)
- one shared routing tree
- multiple shells depending on the route

This is the recommended shape:

```text
subpilot.com/
  -> marketing website
  -> auth routes
  -> merchant dashboard
  -> public checkout
  -> customer portal
```

The visitor should feel like this is one product with different modes, not five unrelated interfaces.

Why this is the right move:

- Marketing, auth, dashboard, checkout, and portal all benefit from the same design language.
- Shared primitives reduce drift and make the product feel intentional.
- A single frontend is easier to ship fast for a hackathon while still feeling complete.
- Deep links are simpler: homepage -> signup, plan URL -> checkout, email link -> portal.

---

## Product Surfaces

SubPilot has four user-facing surfaces served from one codebase:

1. **Marketing Website**: public product and conversion surface at `/`.
2. **Merchant Dashboard**: authenticated browser console.
3. **Public Checkout**: subscriber starts a subscription from a plan URL.
4. **Customer Portal**: token-gated self-service for one subscription.

This separation matters because each surface has a different trust boundary and failure mode.

---

## Trust Boundaries

Summary (details in `docs/auth-model.md`):

| Surface            | Credential                    | Where it lives                  | How it travels                                |
| ------------------ | ----------------------------- | ------------------------------- | --------------------------------------------- |
| Marketing website  | none                          | —                               | Public                                        |
| Dashboard          | backend-owned auth cookies    | Browser cookie jar (`HttpOnly`) | Browser -> Start -> backend cookie forwarding |
| Public checkout    | none                          | —                               | Unauthenticated                               |
| Portal             | `subscriptionToken`           | URL path param                  | `/portal/:token`                              |
| API (programmatic) | `sk_live_...` or bearer token | merchant backend env var        | `Authorization: Bearer <key>`                 |

---

## Request Flows

### 1) Merchant Dashboard (backend-owned cookies)

The dashboard should authenticate with backend-owned `HttpOnly` cookies, while TanStack Start remains the browser-facing app/BFF.

```text
Browser
  └─ App boot / dashboard request
       ├─ Browser sends merchant auth cookies to TanStack Start
       │
       ├─ TanStack Start route loader / server function forwards cookies to backend
       │    ├─ GET /v1/auth/me
       │    └─ other protected merchant endpoints
       │
       ├─ Backend authenticates from cookies
       ├─ Backend may return Set-Cookie on refresh/logout flows
       └─ TanStack Start passes Set-Cookie back to browser and renders dashboard
```

Auth lifecycle endpoints should be:

- `POST /v1/auth/login`
- `POST /v1/auth/signup`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

### 2) Public Checkout (unauthenticated)

This is part of the core value proposition. It is not “later”, it is Phase 1.

```text
Subscriber visits /pay/:merchantSlug/:planSlug
  ├─ Start loader/server function fetches public plan from backend
  ├─ Browser submits checkout action to Start
  ├─ Start calls POST /v1/public/plans/:merchantSlug/:planSlug/checkout
  └─ Redirect to Nomba checkoutUrl
       └─ Nomba webhook -> SubPilot activates subscription (eventually consistent)
```

### 3) Customer Portal (subscription token)

The portal has no merchant dashboard auth and must never import merchant dashboard backend functions.

```text
Browser -> /portal/:token
  └─ Portal routes use token from URL param
       └─ Portal backend calls only (e.g. /v1/portal/:token/*)
            └─ No merchant auth cookie, no dashboard shell
```

---

## Frontend Architecture

### Routing

TanStack Router file-based routes. Target route families:

```text
src/routes/
  index.tsx
  (marketing)/
    how-it-works.tsx
    pricing.tsx
  (auth)/
    login.tsx
    signup.tsx
  (dashboard)/
    _layout.tsx
    overview.tsx
    plans/
      new.tsx
      $planId.tsx
    subscriptions/
      index.tsx
      $subscriptionId.tsx
    invoices/
      index.tsx
      $invoiceId.tsx
    customers/
      index.tsx
      $customerId.tsx
    webhooks/
      index.tsx
      deliveries.tsx
    events.tsx
    revenue.tsx
    settings/
      api-keys.tsx
      account.tsx
  pay/
    $merchantSlug/
      $planSlug.tsx
  portal/
    $token/
      index.tsx
      invoices.tsx
      available-plans.tsx
```

### Layout shells

One frontend, different shells:

- **MarketingShell**
  - public navigation
  - hero sections
  - product previews
  - footer CTA
- **AuthShell**
  - minimal centered auth cards
- **AppShell**
  - sidebar + top bar for merchant dashboard
- **CheckoutShell**
  - minimal conversion-focused layout for plan checkout
- **PortalShell**
  - minimal subscriber self-service layout

This is the whole trick. One frontend does not mean one layout. It means one product with route-aware shells.

### Data Fetching

All server data goes through TanStack Query.

Query keys use `[resource, ...params]`:

```ts
["auth", "me"];
["plans"];
["plans", planId];
["subscriptions"];
["subscriptions", subscriptionId];
["portal", token];
["portal", token, "invoices"];
```

### Backend Client / BFF Layer

All backend calls should flow through TanStack Start, not directly from browser components to Spring.

Recommended responsibility split:

- `src/lib/backend/*`
  - server-only backend client modules
  - forwards cookies where needed
- `src/lib/server/functions/*`
  - TanStack Start actions/loaders used by routes
- route components
  - call server functions or loader-backed query functions

For merchant dashboard flows:

- browser sends cookies to Start
- Start forwards cookies to backend
- backend authenticates from cookie
- backend returns data and, when needed, `Set-Cookie`
- Start passes that through

---

## Monetary Handling

The backend returns all money as integer kobo.

Rules:

- backend client modules accept and return kobo as `number`
- rendering must go through a single formatter: `formatNGN(kobo)`
- forms accept NGN but submit kobo

Target utility (to be implemented under `src/lib/utils/currency.ts`):

```ts
export function formatNGN(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(kobo / 100);
}
```

---

## Error and Async UX

The backend is event-driven in key places, webhooks and the billing engine. The UI must explicitly model eventual consistency:

- “Payment pending / awaiting confirmation” states on public checkout return flow
- “Subscription may take up to 30 seconds to appear” guidance plus a refresh affordance
- clear empty/error states on every list screen
- explicit session-expired handling for merchant routes when refresh fails or backend logout clears cookies

Detailed rules for loading, timeout thresholds, retry behavior, and failure handling live in `docs/frontend-error-and-loading-strategy.md`.

---

## Verification and Test Gates

Verification is per-phase (see `docs/roadmap.md`), not one giant manual checklist.

Minimum test gates:

- Phase 0: contract and parsing tests for auth bootstrap, `me`, and core DTOs
- Phase 1: one E2E smoke for signup -> create plan -> publish -> subscription appears
- Phase 2: integration tests for dunning visibility, invoice formatting, webhook registration
- Phase 3: E2E smoke for portal open -> cancel-at-period-end -> status reflects correctly
