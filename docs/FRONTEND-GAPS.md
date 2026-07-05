# Frontend Gaps — SubPilot

This doc tracks what is missing in the frontend relative to what the real backend
(`sub-pilot/`, Spring Boot, `co.subpilot.*`) actually implements today.

**This replaces the previous version of this file**, which was written when the
backend was mostly a stub — password change, refresh, logout, and dunning CRUD were
all listed as "blocked on backend," but the backend has since implemented all of
them, and the frontend already calls all of them correctly. `docs/backend-contract-matrix.md`
is similarly stale (it also predates password-change/logout/refresh landing, and
frames auth as JWT-in-body rather than cookie-based) — treat this file as current,
that one as historical.

**Sourcing:** this file reflects a direct read of the backend's actual controllers,
DTOs, and security config under `sub-pilot/src/main/java/co/subpilot/` (every
endpoint/field/enum below was read from the real Java source, not inferred), cross-checked
against the frontend's current `src/types/api.ts` and `src/lib/api/*.ts`.

---

## Current state, in one line

The backend is essentially complete for everything the merchant dashboard, public
checkout, and customer portal currently do. The frontend's existing contract types
already match it closely — pagination params, error envelope shape, and enum values
are correct per-endpoint, including non-obvious ones (see "Already correct" below).
The real gaps are: two genuinely missing features, one separate application that
was never started, and one small type-safety bug.

---

## Missing feature 1 — Invoice refunds

The backend fully supports this; the frontend has nothing.

- `POST /v1/invoices/{invoiceId}/refund` — body `{ amount?: number, reason?: string }`
  (amount omitted = full refund). Requires merchant session + CSRF header (mutating,
  not under `/v1/auth/`).
- `GET /v1/invoices/{invoiceId}/refund` — returns `RefundResponse[]` for that invoice.
- Response shape (`RefundDtos.RefundResponse`, none of this exists in
  `src/types/api.ts` yet):
  ```ts
  interface RefundResponseDto {
    id: string;
    invoiceId: string;
    amount: number;
    currency: string;
    platformFeeRefunded: number;
    status: "pending_approval" | "pending" | "succeeded" | "failed" | "rejected";
    reason: string | null;
    nombaReference: string | null;
    failureReason: string | null;
    createdAt: string;
    resolvedAt: string | null;
  }
  ```
- Note the `pending_approval` status: refunds above some threshold appear to route
  through the internal-admin approval queue (see Missing feature 2,
  `InternalRefundController`) before actually processing — the merchant-facing UI
  should account for a refund sitting in `pending_approval` for a while, not just
  `pending`.
- What to build: a refund action on the invoice detail page
  ([src/routes/_dashboard/invoices/$invoiceId.tsx](../src/routes/_dashboard/invoices/$invoiceId.tsx)),
  a confirmation step (full vs partial amount), and a refund-status display —
  existing copy already says "Voiding stops collection. It does not refund," so the
  distinction was anticipated, just never wired up.

---

## Missing feature 2 — Internal admin panel (a separate application, not a page)

`/v1/internal/**` is a structurally distinct system from the merchant-facing API —
its own auth, its own cookie, its own roles. Nothing under this exists in the
frontend today. Treat this as its own project, not an add-on to the merchant
dashboard.

**Auth mechanics** (`co.subpilot.internal.admin.security`):
- Separate cookie: `_subpilot_internal_session` (vs. merchant's `_subpilot_session`)
  — separate JWT signing key, separate claims (`sub`=adminId, `role`, `email`).
- `POST /v1/internal/auth/login` is the only public internal route; everything else
  under `/v1/internal/**` requires this cookie specifically (the merchant session
  cookie has no effect here, and vice versa).
- Roles: `super_admin`, `ops_admin` (string constants). No signup endpoint —
  internal admins are seeded via a DB migration, not self-service.
- One flagged inconsistency worth knowing before building against it: the cookie's
  own doc-comment says its `Path` "MUST match `/v1/internal`," but the actual
  constant value is `"/"` — the cookie is sent on every path, not scoped to
  `/v1/internal`. Not a frontend problem to fix, just don't assume the path scoping
  described in comments is what's actually enforced.

**Endpoints to build a frontend against:**
| Method | Path | Purpose |
|---|---|---|
| `POST /v1/internal/auth/login` | login → `MeResponse` | 
| `GET /v1/internal/auth/me` | session check |
| `POST /v1/internal/auth/logout` | logout |
| `GET /v1/internal/merchants` | list (`query`, `status`, `page`/`size`) |
| `GET /v1/internal/merchants/{id}` | detail |
| `PATCH /v1/internal/merchants/{id}/status` | change status, reason required — allowed transitions: `active → under_review`; `under_review → active \| suspended`; `suspended → active` |
| `GET /v1/internal/merchants/{id}/fees` | effective + override fee rate |
| `PATCH /v1/internal/merchants/{id}/fees` | set per-merchant fee override, reason required |
| `DELETE /v1/internal/merchants/{id}/fees` | remove override, reason required (DELETE with a JSON body) |
| `GET /v1/internal/fees/default` | platform-wide default fee |
| `PATCH /v1/internal/fees/default` | update platform-wide default fee, reason required |
| `GET /v1/internal/refunds` | refund approval queue — **super_admin only**, not paginated (plain list) |
| `POST /v1/internal/refunds/{id}/approve` | super_admin only |
| `POST /v1/internal/refunds/{id}/reject` | super_admin only, optional `{reason}` body |
| `GET /v1/internal/audit` | internal-admin's own audit trail (separate table from merchant audit logs), `page`/`size` |
| `GET /v1/internal/dashboard/summary` | `{ pendingMerchantActivations: number, pendingRefundApprovals: number }` |

Whether `ops_admin` can call the status-update endpoint is config-gated server-side
(`subpilot.internal.ops-admin-can-change-status`, defaults to `false` → super_admin
only) — worth confirming the live config value before assuming `ops_admin` can do
more than read.

---

## Missing feature 3 — Fee ledger (optional, low priority)

`GET /v1/fees/ledger` (`page`/`perPage`, a per-transaction platform-fee list) is
implemented and unused. Low priority: the invoice entity already returns
`platformFeeAmount`/`feeBpsApplied`/`feeFixedApplied` directly, so a per-invoice fee
breakdown doesn't need this endpoint. The only thing it would add is a dedicated
"all fee transactions" table view under Revenue settings — build only if there's an
actual request for it.

---

## Contract bug to fix

`PortalSubscriptionViewDto.nextBillingDate` in
[src/types/api.ts](../src/types/api.ts) is typed as `string`, but the backend's
`PortalSubscriptionView.nextBillingDate` is nullable (a paused or cancelled
subscription has none). Should be `string | null`, matching how `trialEndsAt` is
already typed on the same interface. Small, mechanical fix — no known runtime bug
observed yet, just a type that will eventually lie.

---

## Already correct — confirmed, not gaps

Worth recording so this doesn't get re-litigated later:

- **Pagination params are correctly per-endpoint already.** The backend is
  inconsistent on purpose or by accretion (`perPage` for customers/plans/audit-logs/fees-ledger;
  `size` for subscriptions/invoices/events/webhooks/payouts/internal-*), and the
  frontend's `src/lib/api/*.ts` already sends the right param name for every one of
  them.
- **Audit-log action taxonomy** (`src/data/audit-logs.ts`) is a 19/19 exact match
  against the backend's real `AuditAction` constant list.
- **Webhook event-name catalogue** (`src/data/webhooks.ts`) correctly reflects the
  backend's internal-enum → dotted-event-name mapping, including non-obvious cases
  like `PAYMENT_SUCCEEDED` → `payment_attempt.succeeded` (not `payment.succeeded`).
- **The bare 403 with no JSON body** that Spring Security returns for any
  unauthenticated request (there's no custom `AuthenticationEntryPoint` registered,
  so the fallback is a bodyless `Http403ForbiddenEntryPoint`, not a 401) is already
  handled gracefully: `backendRequest`'s `parseBackendError` in
  [src/lib/api/backend.ts](../src/lib/api/backend.ts) falls back to a status-code-keyed
  message when the body isn't valid JSON, so `classifyError` still correctly buckets
  it as `auth_expired`.
- All enum/status unions in `src/types/api.ts` (`SubscriptionStatusDto`,
  `PlanStatusDto`, `BillingIntervalDto`, `ProrationPolicyDto`, `InvoiceStatusDto`,
  `DisbursementStatusDto`, `WebhookDeliveryStatusDto`) match the backend's real
  values exactly, including which ones are true Java enums vs. plain validated
  strings on the backend side.
