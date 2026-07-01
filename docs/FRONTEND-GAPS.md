# Frontend Gaps — SubPilot

This doc tracks what is missing in the frontend relative to the backend capabilities.

It used to be “blocked on backend gaps”. The backend is now present in this repo under `sub-pilot-backend/`, and many core endpoints exist. The remaining gaps are a mix of:

- Frontend work not yet implemented
- True backend blocks (refunds, payouts, password change, refresh/logout)

For backend readiness, see `docs/backend-contract-matrix.md`.

---

## Summary

The backend already exposes: plans, subscriptions (including public checkout init), portal, invoices, customers, fees, events, and webhooks. Merchant web auth is now wired to the backend-owned cookie model described in `docs/backend-auth-architecture-request.md`.

The frontend is still a starter app, so the primary gap is “wire the UI to real API modules with correct auth and money handling”.

---

## Frontend Gap 0 — Merchant Web Auth Wiring (backend-owned cookies)

**Blocked on:** not blocked

**Status:** done

**What now exists:**

- TanStack Start forwards browser cookies to the backend for merchant-protected calls
- Backend `Set-Cookie` headers are passed back to the browser on login/signup/refresh/logout
- A single server-side path handles `401` / refresh failure and redirects to `/auth/login`
- Merchant shell bootstraps from `GET /v1/auth/me`

---

## Frontend Gap 1 — Invoice Refund Action

**Blocked on:** No refund endpoint is present in the backend controllers.

**What will be built once unblocked:**

- Enable a Refund action on invoice detail
- Confirmation modal + optimistic UI refresh on success
- Refund status chip once the backend exposes refund state

---

## Frontend Gap 2 — Revenue Dashboard Payouts

**Blocked on:** No payouts/transfer-disbursement endpoints are present.

**What will be built once unblocked:**

- “Request payout” action and payout history table
- Payout detail view (transfer reference, covered period, settlement status)

---

## Frontend Gap 3 — Dunning Campaign Configuration

**Blocked on:** No dunning campaign CRUD endpoints are present.

**What will be built once unblocked:**

- `/settings/dunning` timeline editor (retry steps, exhaustion action)

---

## Frontend Gap 4 — Silent Token Refresh (optional)

**Blocked on:** No token refresh endpoint is present.

**What will be built once unblocked:**

- 401 interceptor retries after refresh (mutex to avoid stampede)

---

## Frontend Gap 5 — Server-Side Logout (optional)

**Blocked on:** No `/v1/auth/logout` endpoint is present.

**What will be built once unblocked:**

- Logout calls backend to invalidate the session token, then clears client auth state

---

## Frontend Gap 6 — Password Change

**Blocked on:** No password change endpoint is present.

**What will be built once unblocked:**

- Account settings password form wired to `PATCH /v1/auth/change-password`
