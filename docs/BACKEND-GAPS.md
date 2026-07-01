# Backend Gaps

These are backend gaps that currently block parts of the frontend from being implemented cleanly.

## Gap 1 — Merchant Session Lifecycle Is Incomplete

The backend already sets the merchant access token as an `HttpOnly` cookie, and the auth filter already reads that cookie.

What is still missing for a reliable frontend auth flow:

- `GET /v1/auth/me` for session bootstrap on page load and dashboard route protection
- a usable refresh contract immediately after signup/login
- logout that revokes refresh state even when the short-lived access cookie is already expired
- CSRF protection for cookie-authenticated merchant mutations

Why this blocks the frontend:

- login/signup can be wired, but the frontend cannot reliably restore merchant identity after reload
- the frontend cannot build a durable refresh flow with confidence
- the dashboard cannot add its real server-aware route guard yet

See also:

- `docs/backend-phase-b-handoff.md`
- `docs/backend-auth-architecture-request.md`

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
