1. Real backend wiring — done, including the customer portal
   Plans, subscriptions, customers, invoices, dunning, events, revenue, webhooks, webhook-deliveries, api-keys, account, analytics, audit-log, and the customer-facing portal (src/routes/portal.$token/**, src/lib/api/portal.ts) are all wired to the real backend (createServerFn in src/lib/api/, TanStack Query options factories in src/data/). The portal was the last holdout — it was on mock data until 2026-07-02 because its backend endpoints previously 500'd (BACKEND-GAPS.md Gap 3, a PortalController @PathVariable mismatch); that's now fixed and verified live end-to-end. No mock data remains anywhere in the app.

2. Error/loading UX strategy — implemented
   docs/frontend-error-and-loading-strategy.md's plan has been built out:

Skeleton components (src/components/ui/page-skeleton.tsx, table-skeleton.tsx) are wired as the router's defaultPendingComponent and as per-route pendingComponent overrides on the list pages.
Slow-request tiering exists at src/hooks/use-slow-state.ts (300ms/1500ms/4000ms thresholds) and is wired into the public checkout page (pay.$merchantSlug.$planSlug.tsx).
Eventual-consistency messaging exists on the checkout-success page (plans.$merchantSlug.$planSlug.success.tsx) and in the subscriptions list's empty state.
Error classification exists at src/lib/api/classify-error.ts (auth_expired / not_found / network / validation / server) and is used by the router's error boundaries, useHandleMutationError, and the auth forms.

3. Testing
Only 3 test files exist: auth.test.ts, backend.test.ts, currency.test.ts — all integration-style, all backend-adjacent. Missing:

Any page-level/component test
The E2E tracer-bullet smoke test the roadmap calls for (signup → create plan → publish → checkout → subscription appears) 4. Docs debt (stale, will actively mislead future work)
docs/frontend-build-order.md — still says React Hook Form, Axios, Zustand, src/lib/backend/, (dashboard) route grouping — none of which match reality
docs/roadmap.md — still lists Axios + React Hook Form as libraries to install
docs/backend-contract-matrix.md — header still says "dashboard JWT," should say cookie-based (the content itself is otherwise accurate)
AGENTS.md was already fixed for this in an earlier session — the others weren't 5. Backend-side blocker (not fixable from this repo)
docs/backend-auth-follow-up.md / BACKEND-GAPS.md Gap 1: a valid \_subpilot_session cookie can still cause GET /v1/auth/me to return 500 internal_error on the real backend. Frontend auth bootstrap, CSRF, and refresh-retry are all built and working — this is a backend bug, not a frontend gap.

6. Deployment/CI hardening (from the earlier going-live checklist, unconfirmed since — likely still pending)
   Sentry resolution (install or remove the dead rollup exclusion), pin nitro off the @latest nightly tag, .github/dependabot.yml, security headers/CSP for the two unauthenticated public routes, docs/deployment.md rollback steps, staging branch + environment maturity.

#1 (real data) and #2 (loading/error UX) are done. What's left is #3 (component/E2E test coverage), #4/#6 (docs and deployment hygiene — unverified since, may still be stale), and #5 (the backend-side /v1/auth/me 500 bug, not fixable from this repo).
