# Frontend Build Order

This is the implementation playbook for the **first frontend build pass**.

Important: this build-order doc assumes the recommended **TanStack Start BFF + backend-owned cookie auth** model. Use `docs/frontend-bff-architecture.md`, `docs/backend-auth-architecture-request.md`, and `docs/frontend-error-and-loading-strategy.md` as the auth/data-boundary and UX-failure source of truth before coding.

It exists to answer one question clearly:

> If we start coding now, what do we build first, in what order, with what files, and with what tests?

This is intentionally scoped to:

- **Phase 0**: contracts + scaffold
- **Phase 1**: tracer bullet

It does **not** attempt to cover the whole product in one pass.

---

## Goal

Prove one real end-to-end billing loop with the smallest complete frontend:

1. Visitor lands on marketing homepage
2. Merchant signs up or logs in
3. Merchant creates and publishes a plan
4. Subscriber opens the hosted plan page
5. Subscriber starts checkout
6. Webhook activates subscription in backend
7. Merchant sees the subscription in the dashboard

If this works, the frontend is real.

---

## Working Rules

- Build **one frontend app** with multiple shells, not separate apps.
- Reuse the existing shadcn setup and follow `AGENTS.md`.
- Merchant dashboard data should flow through TanStack Start server functions/loaders backed by server-only backend clients.
- All server state goes through TanStack Query.
- All currency display uses `formatNGN(kobo)`.
- Do not start with “all routes”. Start with the minimum route set that proves the billing loop.
- Do not build browser-managed JWT auth for merchant routes.

---

## Phase 0 Scope

Build only the substrate required to support the tracer bullet:

- environment config
- route shells
- server-only backend client + auth-aware request forwarding
- shared page states
- minimal marketing/auth/dashboard/public checkout routes
- merchant auth bootstrap through backend-owned cookies

---

## Phase 1 Scope

Build only these user-facing routes:

- `/`
- `/auth/login`
- `/auth/signup`
- `/overview`
- `/plans/new`
- `/plans/:planId`
- `/subscriptions`
- `/pay/:merchantSlug/:planSlug`

Anything else is later.

---

## Step 1: Install The Real Stack

Do this before creating product code so the docs match reality.

### Add libraries

- `axios`
- `react-hook-form`
- `@hookform/resolvers`
- `zod`
- `recharts`
- `msw`

### Notes

- `zustand` is no longer required for merchant auth as the primary session source.
- If you still add Zustand later, use it for non-sensitive UI state, not raw merchant auth credentials.

### Done when

- `package.json` includes the libraries the docs already assume
- app boots without dependency errors

### Why first

If the stack is not real, every later file is built on fake assumptions.

---

## Step 2: Create Core Folder Structure

Create the minimum non-demo project structure.

```text
src/
  components/
    auth/
    checkout/
    layout/
    marketing/
    status/
    ui/
  lib/
    backend/
      auth.ts
      client.ts
      plans.ts
      public.ts
      subscriptions.ts
    server/
      auth/
        cookies.ts
        csrf.ts
        merchant-session.ts
      functions/
        auth/
        plans/
        public/
        subscriptions/
    constants/
    utils/
      currency.ts
  routes/
    index.tsx
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
    pay/
      $merchantSlug/
        $planSlug.tsx
  types/
    auth.ts
    plan.ts
    subscription.ts
```

### Notes

- Keep route files under `src/routes/` only.
- Keep DTO-like frontend types under `src/types/`.
- Do not create portal, invoices, customers, events, or revenue routes yet.

### Done when

- folders exist
- route tree matches Phase 1
- no placeholder demo routes remain in active navigation

---

## Step 3: Build The Route Shells

Build the structural shells before real pages.

### Files to create first

- `src/components/layout/marketing-shell.tsx`
- `src/components/layout/auth-shell.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/layout/checkout-shell.tsx`

### Responsibilities

- `MarketingShell`
  - top nav
  - CTA buttons
  - content wrapper
- `AuthShell`
  - centered auth card layout
- `AppShell`
  - sidebar
  - page title area
  - content container
- `CheckoutShell`
  - minimal branded page for checkout

### Done when

- each Phase 1 route has the right shell
- switching between shells still feels like one product
- mobile behavior is safe, even if dashboard mobile is not fully polished yet

---

## Step 4: Build Shared Foundations

Do these before feature pages so you do not duplicate logic later.

### Shared files

- `src/lib/utils/currency.ts`
  - `formatNGN(kobo: number): string`
- `src/components/status/status-badge.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/page-error-state.tsx`
- `src/components/ui/page-loading-state.tsx`
- `src/components/ui/slow-state-notice.tsx`
- toast/notifier foundation if not already present

### Minimal definitions

- `formatNGN`
- `StatusBadge`
- `EmptyState`
- `PageErrorState`
- `PageLoadingState`
- `SlowStateNotice`

### Done when

- every Phase 1 page can use the same loading/empty/error patterns
- every Phase 1 page can use the same slow/delayed-state pattern
- no route hardcodes money formatting
- no route invents its own status pill

---

## Step 5: Build Backend Client + Auth Forwarding Infrastructure

This is the first real data boundary.

### Files

- `src/types/auth.ts`
- `src/lib/backend/client.ts`
- `src/lib/backend/auth.ts`
- `src/lib/server/auth/cookies.ts`
- `src/lib/server/auth/csrf.ts`
- `src/lib/server/auth/merchant-session.ts`
- `src/lib/server/functions/auth/*`

### `src/types/auth.ts`

Define:

- `MerchantSession`
- `MerchantProfile`
- `LoginRequest`
- `SignupRequest`

Use backend-aligned fields only.

### `src/lib/backend/client.ts`

Responsibilities:

- shared server-only backend client
- `baseURL` from env
- forward incoming browser cookies to backend when required
- expose helpers for safely passing `Set-Cookie` back to the browser

### `src/lib/backend/auth.ts`

Functions:

- `login`
- `signup`
- `refresh`
- `logout`
- `getCurrentMerchant`

### `src/lib/server/auth/*`

Responsibilities:

- read request cookies
- normalize merchant session boot state from `/v1/auth/me`
- handle CSRF token flow if required by backend contract
- help protected routes decide whether merchant auth exists
- normalize auth-expired vs network vs server-error states for protected flows

### Done when

- login/signup can round-trip against the real backend
- backend `Set-Cookie` headers reach the browser
- protected backend calls can forward cookies from Start to backend
- `GET /v1/auth/me` can bootstrap merchant shell state

---

## Step 6: Build Route Guards + App Boot

Protect dashboard routes without leaking auth logic into every page.

### Files to touch

- `src/routes/(dashboard)/_layout.tsx`
- root app providers file(s)
- dashboard route loaders/server functions

### Responsibilities

- dashboard routes require merchant auth
- unauthenticated users redirect to `/auth/login`
- auth bootstrap should come from backend-owned cookies + `/v1/auth/me`
- public routes stay public:
  - `/`
  - `/auth/*`
  - `/pay/*`

### Important constraint

Do not put auth checks directly inside every page component.

### Done when

- refreshing a dashboard page with valid backend cookies works cleanly
- unauthenticated access redirects cleanly
- expired auth can refresh or fail gracefully

---

## Step 7: Build The Marketing Homepage

This is part of the tracer bullet, not decoration.

### Route

- `src/routes/index.tsx`

### Supporting components

- `src/components/marketing/hero.tsx`
- `src/components/marketing/feature-grid.tsx`
- `src/components/marketing/how-it-works.tsx`
- `src/components/marketing/product-preview.tsx`

### Content priorities

- explain what SubPilot does
- show dashboard preview
- show portal preview
- explain why it exists on top of Nomba
- drive users to `Get started` and `Sign in`

### Done when

- a first-time visitor can understand the product in 10 seconds
- homepage clearly leads to signup/login
- mobile layout still sells the product cleanly

---

## Step 8: Build Auth Screens

### Routes

- `src/routes/(auth)/login.tsx`
- `src/routes/(auth)/signup.tsx`

### Supporting components

- `src/components/auth/login-form.tsx`
- `src/components/auth/signup-form.tsx`

### Requirements

- React Hook Form + Zod
- inline validation
- backend `message` surfaced on failure
- success redirects into dashboard
- login/signup server functions pass backend `Set-Cookie` headers back to browser
- pending button state and retry-safe failure UX

### Done when

- merchant can sign up and land in `/overview`
- merchant can log in and land in `/overview`

---

## Step 9: Build Plan Backend Functions + Plan Screens

This is the heart of the tracer bullet.

### Files

- `src/types/plan.ts`
- `src/lib/backend/plans.ts`
- `src/lib/server/functions/plans/*`
- `src/routes/(dashboard)/plans/new.tsx`
- `src/routes/(dashboard)/plans/$planId.tsx`
- `src/components/subscription/plan-form.tsx`

### Backend functions

- `createPlan`
- `getPlan`
- `publishPlan`
- optional `listPlans` if needed for follow-up navigation

### UI requirements

- create plan form
- amount uses `AmountInput` or equivalent NGN UI
- publish action on detail page
- hosted checkout URL visible after publish
- copy-to-clipboard interaction

### Done when

- merchant can create a plan
- merchant can publish the plan
- merchant can copy the hosted checkout URL

---

## Step 10: Build Public Checkout

### Files

- `src/types/public.ts` or extend `plan.ts` if the DTO shape is small and obvious
- `src/lib/backend/public.ts`
- `src/lib/server/functions/public/*`
- `src/routes/pay/$merchantSlug/$planSlug.tsx`
- `src/components/checkout/public-checkout-form.tsx`

### Backend functions

- `getPublicPlan`
- `initiateCheckout`

### Requirements

- fetch public plan by merchant slug + plan slug
- collect customer basics
- call checkout-init endpoint
- redirect browser to `checkoutUrl`
- if checkout init is slow or fails, show clear delayed/error state rather than a silent spinner

### Done when

- subscriber can open the plan page
- subscriber can start checkout
- the redirect to Nomba works

---

## Step 11: Build Overview + Subscriptions List

This proves the webhook-driven result is visible.

### Files

- `src/types/subscription.ts`
- `src/lib/backend/subscriptions.ts`
- `src/lib/server/functions/subscriptions/*`
- `src/routes/(dashboard)/overview.tsx`
- `src/routes/(dashboard)/subscriptions/index.tsx`

### Backend functions

- `listSubscriptions`
- optional `getSubscriptionStats` if overview KPIs are real

### UI requirements

- overview can be simple
- subscriptions list must be real
- show subscription status with `StatusBadge`
- show a graceful pending/delayed state if webhook confirmation lags
- show retry affordance for slow/error list states

### Done when

- after checkout + webhook processing, subscription appears in `/subscriptions`
- merchant can understand if activation is delayed vs failed

---

## Step 12: Add Shared Table + Filters Only When Needed

Do not start by building generalized table abstractions unless Phase 1 actually needs them.

### Build now only if needed

- minimal `DataTable` wrapper usage for subscriptions list
- lightweight filters for subscription status

### Defer

- plans list page
- invoices tables
- customers tables
- webhook delivery tables

### Why

Tracer bullet first. Full list infrastructure second.

---

## Backend Strategy: Real vs Mocked

Use the real backend wherever Phase 1 contracts are marked `Ready`.

### Use real backend now

- auth, login/signup/me/refresh/logout contract as it becomes available
- plan create/detail/publish
- public plan fetch
- checkout init
- subscriptions list

### Mock only if strictly necessary

- overview KPI aggregation if the final endpoint is not yet shaped for frontend use
- slow or secondary metrics that do not affect the tracer bullet

### Rule

Do not mock the core billing loop.

If the core loop is mocked, the tracer bullet is fake.

---

## Test Order

Tests should land alongside the slice, not as a cleanup sprint.

### First tests to add

1. `src/lib/server/functions/auth/*.test.ts`
   - signup success
   - login success
   - backend error message surfaced
   - `Set-Cookie` pass-through behavior

2. `src/lib/backend/plans.test.ts`
   - create plan
   - publish plan
   - kobo field handling

3. `src/lib/backend/public.test.ts`
   - fetch public plan
   - initiate checkout returns `checkoutUrl`

4. `src/lib/backend/subscriptions.test.ts`
   - list subscriptions
   - delayed or empty response handling
   - session-expired handling on protected calls

5. one end-to-end smoke
   - signup
   - create plan
   - publish plan
   - open public checkout
   - verify subscription appears after backend processing
   - verify delayed/pending subscription messaging if webhook confirmation lags

### Test tool strategy

- backend client / server functions: integration-style tests with MSW or suitable request mocking
- utility functions: unit tests
- core flow: one E2E smoke

### Do not waste time on

- isolated “renders without crashing” tests for every page
- snapshot spam
- testing shadcn internals

---

## Suggested Build Sequence By Day

### Session 1

- install real libraries
- create folders
- build shells
- build backend client + auth forwarding substrate

### Session 2

- build homepage
- build login/signup
- wire auth success path

### Session 3

- build plan create
- build plan detail + publish

### Session 4

- build public checkout
- build subscriptions list
- verify tracer bullet end-to-end

If you move fast, this can compress. The ordering still stands.

---

## Definition Of Done For The First Build Pass

The first build pass is done when all of these are true:

- `/` sells the product and routes correctly to auth
- merchant can sign up/login
- merchant auth cookies round-trip correctly through Start
- merchant can create and publish a plan
- merchant can copy the hosted checkout link
- subscriber can initiate checkout
- merchant can see the subscription in `/subscriptions`
- all money is formatted correctly
- auth, plans, public checkout, and subscriptions backend functions have tests
- loading, empty, error, and delayed states exist for every Phase 1 route
- one end-to-end tracer-bullet flow passes

That is enough to say “the frontend is real”.

---

## Explicitly Not In Scope For This Pass

- portal routes
- invoices UI
- customers UI
- revenue dashboards
- webhook endpoint management UI
- webhook deliveries UI
- events audit log UI
- API key UI
- pricing page
- dark mode
- full mobile optimization of dense dashboard tables

These are not forgotten. They are deferred on purpose.

---

## Final Recommendation

Start building immediately after this doc, but start with **substance**:

- substrate
- auth forwarding and app boot
- plans
- public checkout
- subscriptions visibility

Do not start with the prettiest edge of the product.
Start with the loop that proves the product deserves polish.
