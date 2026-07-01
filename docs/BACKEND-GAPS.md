# Backend Gaps

These are backend gaps that currently block parts of the frontend from being implemented cleanly.

## Gap 1 — Merchant Session Lifecycle Follow-Up

The backend now exposes the core cookie-auth pieces the frontend needed:

- `GET /v1/auth/me` for session bootstrap
- refresh-cookie support
- logout keyed off the refresh credential
- CSRF protection for cookie-authenticated merchant mutations

That means Gap 1 is no longer blocking the frontend tracer-bullet flow.

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
