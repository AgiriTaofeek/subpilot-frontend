# Product Requirements — SubPilot Internal Admin Dashboard

## Problem Statement

SubPilot currently has merchant-facing surfaces, public checkout, and a customer
portal, but it has no true internal operating console for the SubPilot team.

That means core platform operations are missing a controlled interface for:

- finding and reviewing merchants across the platform
- configuring platform fees and merchant-specific fee overrides
- suspending or reviewing merchants when there is risk, abuse, or support need
- tracking who changed a merchant's status or fee settings

Without this internal surface, the team has to operate the platform through ad
hoc backend access, database inspection, or one-off engineering help. That does
not scale, it is error-prone, and it is especially dangerous for fee policy and
merchant controls because those are sensitive actions with financial impact.

The first version should not try to be a full backoffice. It should solve the
highest-leverage internal jobs first:

- merchant management
- fee configuration
- basic operational control
- auditability

## Solution

Build a lean **internal admin dashboard** as a **separate internal surface
inside the existing TanStack Start frontend application**.

This is not a second web app and it is not an extension of the merchant
dashboard. It is a separate route family, shell, auth model, and API boundary
served from the same frontend codebase.

Recommended shape:

- same frontend codebase
- separate internal route family, for example `/internal/*`
- separate internal login
- separate internal session/cookie from merchant auth
- separate internal backend namespace, for example `/v1/internal/*`
- separate internal shell and navigation
- edge protection via Cloudflare Access or equivalent Zero Trust layer

The first version focuses on five jobs:

1. Internal admin can sign in to the internal surface
2. Internal admin can search and inspect merchants
3. Internal admin can configure fee policy
4. Internal admin can manage merchant operational status
5. Internal admin can see an audit trail of sensitive changes

This gives SubPilot a real operating console without overbuilding a full
support/finance/risk suite on day one.

## Users

### Super Admin

An internal SubPilot operator with full access to the internal admin surface.

Needs to:

- view all merchants
- configure platform default fees
- configure merchant fee overrides
- change merchant status
- review all audit entries

### Ops Admin

An internal SubPilot operator responsible for day-to-day merchant operations.

Needs to:

- find merchants quickly
- inspect merchant state
- change merchant operational status
- understand which fee configuration is currently effective

## V1 Scope

### Included

- Internal admin login
- Internal admin overview
- Merchant list
- Merchant detail
- Platform default fee configuration
- Merchant-specific fee override
- Merchant status management
- Audit log for fee and status changes

### Excluded

- Full subscriptions/invoices/customers support console
- Refund or payout operations
- Merchant impersonation
- Advanced platform analytics
- Admin-user management UI
- Internal notes/comments system
- Complex multi-step approvals
- SSO as a required V1 dependency

## Success Criteria

1. An internal admin can sign in through a separate internal login and reach the
   internal dashboard.
2. An internal admin can search merchants by business name, email, merchant ID,
   or slug.
3. An internal admin can open a merchant detail page and see the merchant's
   current status and effective fee configuration.
4. An internal admin can change platform default fees.
5. An internal admin can set a merchant-specific fee override.
6. An internal admin can move a merchant between `active`, `under_review`, and
   `suspended`.
7. Every fee or status mutation creates an audit record containing actor, time,
   target merchant, old value, new value, and reason.
8. A merchant session cannot access internal routes, and an internal admin
   session cannot be confused with a merchant session.

## User Stories

1. As a super admin, I want to sign in through a dedicated internal login, so
   that internal operations are isolated from merchant access.
2. As an ops admin, I want the internal surface protected separately from the
   merchant dashboard, so that sensitive controls are not mixed into merchant
   routes.
3. As an ops admin, I want to see an internal overview page, so that I know I
   am in the internal operating console and not the merchant dashboard.
4. As an ops admin, I want to search merchants by business name, so that I can
   find accounts quickly.
5. As an ops admin, I want to search merchants by email, merchant ID, or slug,
   so that I can find accounts from support context or backend references.
6. As an ops admin, I want to filter merchants by status, so that I can review
   only active, under-review, or suspended merchants.
7. As an ops admin, I want a merchant list with pagination and sorting, so that
   the console remains usable as the merchant count grows.
8. As an ops admin, I want each merchant row to show key identity and status
   information, so that I can triage without opening every merchant.
9. As an ops admin, I want to click into a merchant detail page, so that I can
   inspect the merchant in depth.
10. As an ops admin, I want the merchant detail page to show business identity,
    so that I know exactly which merchant I am operating on.
11. As an ops admin, I want the merchant detail page to show the current
    operational status, so that I know whether the merchant is active, under
    review, or suspended.
12. As an ops admin, I want the merchant detail page to show the effective fee
    configuration, so that I know what the merchant is actually being charged.
13. As a super admin, I want to see whether the merchant is using the platform
    default fee or a merchant-specific override, so that fee policy is legible.
14. As a super admin, I want to update the platform default fee policy, so that
    I can manage SubPilot's baseline monetization centrally.
15. As a super admin, I want to set a merchant-specific fee override, so that I
    can support negotiated or strategic accounts.
16. As a super admin, I want to remove a merchant-specific override, so that a
    merchant can fall back to the platform default fee again.
17. As a super admin, I want to see the old and new fee values before saving, so
    that I can avoid accidental financial mistakes.
18. As a super admin, I want fee changes to require a reason, so that sensitive
    decisions are auditable.
19. As an ops admin, I want to mark a merchant as `under_review`, so that I can
    flag concern without immediately suspending them.
20. As a super admin, I want to suspend a merchant, so that SubPilot can stop or
    restrict merchants that present operational or risk issues.
21. As a super admin, I want to reactivate a merchant, so that temporary actions
    can be reversed safely.
22. As an ops admin, I want merchant status changes to require a reason, so that
    the context for the change is preserved.
23. As an internal admin, I want every sensitive action recorded in an audit log,
    so that the team can reconstruct who changed what and why.
24. As an internal admin, I want to filter the audit log by merchant or action
    type, so that I can investigate changes quickly.
25. As a super admin, I want the system to clearly deny actions I do not have
    permission for in lower roles, so that access is predictable and safe.
26. As an internal admin, I want session expiry and forbidden states to be
    handled clearly, so that the console fails safely.
27. As the engineering team, I want the internal admin surface to be isolated at
    the route, auth, and API layers, so that the codebase stays safe and
    maintainable.

## End-to-End Flow

### 1. Internal Admin Access

1. The admin visits the internal hostname or internal route family, for example
   `internal.subpilot.com/internal/login` or `/internal/login`.
2. Cloudflare Access or another Zero Trust layer checks whether the user is
   allowed to reach the internal surface at all.
3. The admin submits credentials through a dedicated internal login form.
4. TanStack Start sends the login request to an internal backend auth endpoint,
   not the merchant auth endpoint.
5. The backend validates the internal admin account and returns a dedicated
   internal admin session cookie.
6. TanStack Start passes that cookie back to the browser.
7. The browser is redirected to `/internal/overview`.
8. On later internal route requests, TanStack Start forwards the internal admin
   cookie to internal admin backend endpoints, just as it already does for
   merchant cookie flows, but through a separate internal trust boundary.

### 2. Merchant Discovery

1. The admin lands on `/internal/merchants`.
2. The page loads a paginated merchant list from an internal backend endpoint.
3. The admin can search by business name, email, merchant ID, or slug.
4. The admin can filter by merchant status.
5. The page shows enough summary information to triage quickly.
6. Clicking a merchant opens `/internal/merchants/:merchantId`.

### 3. Merchant Detail

1. The internal merchant detail page loads the merchant's core identity.
2. It loads the merchant's current operational status.
3. It loads the merchant's effective fee configuration.
4. It shows whether the merchant is using:
   - platform default fees
   - merchant-specific override fees
5. It shows recent admin actions for that merchant.
6. The admin can act from this page if they have permission.

### 4. Platform Default Fee Configuration

1. A super admin opens `/internal/fees`.
2. The page shows the current platform default fee settings.
3. The admin edits the fee parameters.
4. The UI shows a confirmation summary before save.
5. The admin must provide a reason.
6. The backend validates and saves the new platform fee policy.
7. The system writes an audit log entry.
8. All merchants without an override now inherit the new default fee.

### 5. Merchant-Specific Fee Override

1. A super admin opens a merchant detail page.
2. The page shows the merchant's current fee source.
3. The admin chooses to create or edit a merchant-specific override.
4. The UI shows:
   - current effective fee
   - proposed override fee
   - whether the override will replace the default
5. The admin provides a reason and confirms.
6. The backend saves the override.
7. The system writes an audit log entry.
8. The merchant detail page refreshes and now shows the override as active.

### 6. Merchant Status Management

1. An internal admin opens a merchant detail page.
2. The page shows the current merchant status.
3. The admin chooses a permitted transition:
   - `active` -> `under_review`
   - `under_review` -> `suspended`
   - `under_review` -> `active`
   - `suspended` -> `active`
4. The UI requires a reason before save.
5. The backend validates the transition and permissions.
6. The backend saves the new status.
7. The system writes an audit log entry.
8. The merchant detail page refreshes with the new status.

### 7. Audit Review

1. An internal admin opens `/internal/audit`.
2. The page loads recent admin actions.
3. The admin can filter by merchant, actor, action type, or date window.
4. Each record shows:
   - actor
   - target merchant
   - action type
   - previous value
   - new value
   - reason
   - timestamp
5. The audit log is read-only.

## Backend Read This First

This section is the backend-oriented summary of what this feature actually needs.

The frontend recommendation is:

- same deployed frontend application
- separate internal route family such as `/internal/*`
- separate internal auth from merchant auth
- separate internal backend namespace such as `/v1/internal/*`

The important point for backend is simple:

- this is **not** merchant auth with an extra role check
- this is a **separate internal admin surface**
- internal admin sessions must not share the same cookie/session contract as
  merchant sessions

### Backend owns these responsibilities

1. Internal admin authentication
2. Internal admin authorization by role
3. Merchant search/list/detail data for internal use
4. Platform fee configuration
5. Merchant-specific fee override storage and resolution
6. Merchant status transitions
7. Audit logging for sensitive internal actions

### Frontend assumes these backend guarantees

1. Internal admin routes use a separate auth/session contract from merchant
   dashboard routes.
2. Internal endpoints return enough information for the internal console to
   render without stitching together many unrelated calls.
3. Sensitive mutations are permission-checked server-side, even if the frontend
   also hides buttons.
4. Every fee and merchant-status mutation writes a durable audit record.
5. Backend returns explicit forbidden or validation responses instead of generic
   500s for expected denial cases.

## Backend Contract Needed For V1

### 1. Internal Admin Auth

The backend should expose a separate internal auth family.

Required endpoints:

- `POST /v1/internal/auth/login`
- `POST /v1/internal/auth/logout`
- `GET /v1/internal/auth/me`

Expected behavior:

- login validates an internal admin account
- login sets a dedicated internal admin session cookie
- `me` returns the currently authenticated internal admin identity
- logout clears the internal admin session cookie
- merchant cookies must not authenticate internal routes
- internal admin cookies must not authenticate merchant routes

Backend enforcement of the last two points is the real guarantee, but as
defense in depth the internal admin cookie should also be set with
`Path=/internal` (or the equivalent for whatever internal route prefix is
chosen) so the browser itself does not attach it to merchant or checkout
requests in the first place, the same way the merchant cookies (`_subpilot_session`,
`_subpilot_refresh`, `_subpilot_csrf`) are today implicitly scoped to the whole
app because there is currently only one auth surface.

Recommended `GET /v1/internal/auth/me` response shape:

| Field         | Type   | Notes                              |
| ------------- | ------ | ---------------------------------- |
| `adminId`     | string | Stable internal admin identifier   |
| `email`       | string | Internal admin email               |
| `role`        | string | `super_admin` or `ops_admin` in V1 |
| `displayName` | string | Safe display label for the UI      |

### 2. Merchant Directory

Required endpoints:

- `GET /v1/internal/merchants`
- `GET /v1/internal/merchants/{merchantId}`

`GET /v1/internal/merchants` must support:

- search by business name
- search by email
- search by merchant ID
- search by slug
- filter by status
- pagination
- stable sorting

Recommended merchant list response fields:

| Field          | Type            | Notes                                     |
| -------------- | --------------- | ----------------------------------------- |
| `merchantId`   | string          | Primary key shown in internal tooling     |
| `businessName` | string          | Merchant display name                     |
| `email`        | string          | Merchant account email                    |
| `slug`         | string          | Public merchant slug when available       |
| `status`       | string          | `active`, `under_review`, or `suspended`  |
| `feeSource`    | string          | `platform_default` or `merchant_override` |
| `createdAt`    | datetime string | For sorting and context                   |
| `updatedAt`    | datetime string | For recency and audit context             |

Recommended merchant detail response fields:

| Field                    | Type            | Notes                                        |
| ------------------------ | --------------- | --------------------------------------------- |
| `merchantId`             | string          | Stable merchant identifier                   |
| `businessName`           | string          | Merchant display name                        |
| `email`                  | string          | Merchant account email                       |
| `slug`                   | string          | Public merchant slug                         |
| `status`                 | string          | Current operational status                   |
| `feeSource`              | string          | `platform_default` or `merchant_override`    |
| `effectiveFeeBps`        | integer         | Effective percentage fee in basis points     |
| `effectiveFixedFeeMinor` | integer         | Effective fixed fee, in minor currency units |
| `overrideFeeBps`         | integer or null | Present only when merchant override exists   |
| `overrideFixedFeeMinor`  | integer or null | Present only when merchant override exists   |
| `createdAt`              | datetime string | Merchant creation time                       |
| `updatedAt`              | datetime string | Last merchant update time                    |

### 3. Platform Fee Configuration

Required endpoints:

- `GET /v1/internal/fees/default`
- `PATCH /v1/internal/fees/default`

Expected `GET` response fields:

| Field              | Type            | Notes                                        |
| ------------------ | --------------- | --------------------------------------------- |
| `feeBps`           | integer         | Percentage fee in basis points               |
| `fixedFeeMinor`    | integer         | Fixed fee, in minor currency units (e.g. kobo) |
| `updatedAt`        | datetime string | Last time policy changed                     |
| `updatedByAdminId` | string or null  | Who last changed it                          |

Expected `PATCH` request fields:

| Field           | Type    | Notes                      |
| --------------- | ------- | -------------------------- |
| `feeBps`        | integer | New default percentage fee |
| `fixedFeeMinor` | integer | New default fixed fee      |
| `reason`        | string  | Required for audit logging |

Rules:

- only `super_admin` can change platform default fees
- backend validates allowed numeric ranges
- backend writes an audit record containing previous and new values

### 4. Merchant-Specific Fee Override

Required endpoints:

- `GET /v1/internal/merchants/{merchantId}/fees`
- `PATCH /v1/internal/merchants/{merchantId}/fees`
- `DELETE /v1/internal/merchants/{merchantId}/fees`

`GET` should return:

| Field                          | Type            | Notes                                       |
| ------------------------------ | --------------- | -------------------------------------------- |
| `feeSource`                    | string          | `platform_default` or `merchant_override`   |
| `platformDefaultFeeBps`        | integer         | Current global default                      |
| `platformDefaultFixedFeeMinor` | integer         | Current global default                      |
| `overrideFeeBps`               | integer or null | Merchant override if present                |
| `overrideFixedFeeMinor`        | integer or null | Merchant override if present                |
| `effectiveFeeBps`              | integer         | Final fee the merchant currently uses       |
| `effectiveFixedFeeMinor`       | integer         | Final fixed fee the merchant currently uses |

`PATCH` request should accept:

| Field                   | Type    | Notes                             |
| ----------------------- | ------- | ---------------------------------- |
| `overrideFeeBps`        | integer | Merchant percentage fee override  |
| `overrideFixedFeeMinor` | integer | Merchant fixed fee override       |
| `reason`                | string  | Required for audit logging        |

`DELETE` behavior:

- removes the merchant override
- merchant falls back to platform default
- requires audit reason, either in request body or query param, but backend and
  frontend should agree on one explicit shape

Rules:

- only `super_admin` can create, update, or remove merchant fee overrides
- backend returns the effective fee after mutation
- every mutation writes an audit record

### 5. Merchant Status Management

Required endpoint:

- `PATCH /v1/internal/merchants/{merchantId}/status`

Expected request fields:

| Field    | Type   | Notes                      |
| -------- | ------ | -------------------------- |
| `status` | string | Target status              |
| `reason` | string | Required for audit logging |

Allowed V1 statuses:

- `active`
- `under_review`
- `suspended`

Allowed V1 transitions:

| From           | To             |
| -------------- | -------------- |
| `active`       | `under_review` |
| `under_review` | `active`       |
| `under_review` | `suspended`    |
| `suspended`    | `active`       |

Rules:

- backend enforces the transition rules
- backend rejects invalid transitions with a clear validation/business error
- backend writes an audit record with previous status, new status, actor, and
  reason

### 6. Audit Log

Required endpoint:

- `GET /v1/internal/audit`

The audit log should support filtering by:

- merchant ID
- actor admin ID
- action type
- date range

Recommended audit response fields:

| Field          | Type            | Notes                                                                                                                        |
| -------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `auditId`      | string          | Stable audit identifier                                                                                                      |
| `actorAdminId` | string          | Admin who performed the action                                                                                               |
| `actorEmail`   | string          | Useful for UI review                                                                                                         |
| `targetType`   | string          | For V1 mainly `merchant` or `platform_fee_policy`                                                                            |
| `targetId`     | string          | Merchant ID or policy identifier                                                                                             |
| `actionType`   | string          | Example: `merchant_status_changed`, `platform_fee_updated`, `merchant_fee_override_updated`, `merchant_fee_override_removed` |
| `oldValue`     | object          | Structured previous state                                                                                                    |
| `newValue`     | object          | Structured next state                                                                                                        |
| `reason`       | string          | Required mutation reason                                                                                                     |
| `createdAt`    | datetime string | Audit timestamp                                                                                                              |

This is deliberately a new endpoint and shape, not an extension of the
existing merchant-facing `GET /v1/audit-logs` (`AuditLogDto` in
`src/types/api.ts`). That existing type requires a non-null `merchantId` on
every record and its `actorType` is `"user" | "api_key"`, i.e. it assumes the
actor is always scoped to one merchant tenant. A platform-fee-policy change
has no single merchant to attach to, and an internal admin is not a merchant
user or API key, so bending that type to fit would mean making `merchantId`
optional and inventing a third `actorType` on a contract that other merchant
tooling depends on being tenant-scoped. Keeping the internal audit trail on
its own endpoint avoids that and keeps both systems easy to reason about
independently.

## Permission Model

V1 should keep permissions simple.

### `super_admin`

Can:

- log in to internal routes
- view merchant list and detail
- change platform default fees
- create, update, and remove merchant fee overrides
- change merchant status
- view audit log

### `ops_admin`

Can:

- log in to internal routes
- view merchant list and detail
- change merchant status if the business decides that is allowed in V1
- view audit log

Cannot:

- change platform default fees
- create, update, or remove merchant fee overrides

If the business wants status changes to be `super_admin` only, that is also
acceptable, but the backend and frontend need one explicit rule.

## Error Expectations

The backend should return explicit errors for expected failure cases.

Expected categories:

- `401` when there is no valid internal admin session
- `403` when the admin is authenticated but lacks permission
- `404` when the merchant does not exist
- `409` or `422` for invalid status transitions or invalid fee-change requests

The backend should avoid returning generic `500` responses for expected role,
validation, or transition failures.

## Data Modeling Expectations

The PRD does not require a specific database design, but the backend must have
clear storage for:

- internal admin accounts
- internal admin roles
- merchant operational status
- platform default fee policy
- merchant-specific fee overrides
- audit records for internal admin mutations

Important modeling rule:

- fee overrides should not force the frontend to calculate effective values by
  itself from multiple endpoints
- the backend should return effective fee values directly on merchant detail and
  fee endpoints

Storage for internal admin accounts must exist before login can work at all,
but how rows get into that table for the first time is an open question — see
Open Questions.

## Frontend-Backend Integration Expectations

The frontend will call internal endpoints through TanStack Start server
functions, just like the merchant dashboard already forwards backend calls.

That means the backend contract should be frontend-friendly in these ways:

- no need for the browser to manually manage internal auth tokens
- cookie-based internal auth is preferred for the web console
- internal endpoints should return stable DTOs that map directly to list/detail
  screens
- mutation endpoints should return the new canonical state after write so the UI
  can refresh confidently

### Do not reuse the merchant `backendRequest()` helper as-is

The existing shared HTTP client (`src/lib/api/backend.ts`) is built specifically
around merchant auth and is not safe to call unmodified for `/v1/internal/*`:

- it auto-retries any `401`/`403` by calling `POST /v1/auth/refresh`, which is
  the **merchant** session refresh endpoint. An internal admin session expiring
  would incorrectly trigger a merchant-refresh call instead of an
  internal-admin-refresh call (or instead of just failing and prompting
  re-login, if refresh is not part of internal V1).
- it reads and forwards the browser's entire `cookie` header wholesale on every
  request. If a browser tab happens to hold both a merchant session cookie and
  an internal admin session cookie at once, both are sent on every backend
  call regardless of which surface it's for. Backend must not authenticate a
  request based on the presence of the wrong cookie (already stated above),
  but the frontend should not rely on that alone.
- its CSRF handling is hardcoded to a single cookie name (`_subpilot_csrf`).

The internal surface should get its own small request helper (or an explicit
`surface: "internal"` mode on a shared one) with its own refresh endpoint, its
own CSRF cookie name, and its own non-refreshable path list. Do not just import
and reuse `backendRequest()` from the merchant code path.

## Implementation Decisions

- The internal admin dashboard is a **separate internal surface within the same
  frontend application**.
- The internal admin surface uses a **different route family** from merchant,
  checkout, and portal routes.
- The internal admin surface uses a **different auth flow and session cookie**
  from merchant auth.
- Internal admin APIs use a **separate backend namespace**, ideally
  `/v1/internal/*`.
- Internal admin pages use a **separate shell** and must never reuse merchant
  route guards or merchant session state.
- Internal admin access is protected at **two layers**:
  - edge protection, such as Cloudflare Access
  - application auth and authorization
- V1 roles should stay minimal:
  - `super_admin`
  - `ops_admin`
- Sensitive actions require:
  - explicit permission checks
  - confirmation UI
  - reason entry
  - audit log creation
- Merchant status values in V1 are:
  - `active`
  - `under_review`
  - `suspended`
- Fee configuration follows a simple hierarchy:
  - platform default fee
  - merchant-specific override
- The UI must always show **effective fee**, not just raw stored values.
- Merchant detail should aggregate the minimum useful internal operational data:
  identity, status, fee configuration, and recent admin actions.
- This surface should be built so it can later expand into a deeper support or
  finance console without needing a rewrite.

## Testing Decisions

- Good tests should verify observable behavior and permission boundaries, not
  internal implementation details.
- Auth tests should confirm:
  - internal admin can access internal routes
  - merchant sessions cannot access internal routes
  - expired internal sessions redirect correctly
- Authorization tests should confirm:
  - `ops_admin` can view merchants and manage merchant status if allowed
  - only `super_admin` can change fee policy
- Merchant directory tests should verify search, filter, pagination, and open
  detail behavior.
- Fee configuration tests should verify:
  - platform default fee updates
  - merchant override create/update/remove
  - correct effective-fee resolution
  - required reason capture
- Merchant status tests should verify:
  - valid transitions
  - invalid transition rejection
  - required reason capture
- Audit tests should verify that each sensitive action records:
  - actor
  - merchant
  - old value
  - new value
  - reason
  - timestamp
- A strong end-to-end smoke test for this feature is:
  - internal admin login
  - search merchant
  - open merchant detail
  - update fee override
  - change merchant status
  - verify audit entries exist

## Open Questions

### How are the first internal admin accounts actually created?

V1 explicitly excludes an admin-user management UI (see Out of Scope), but
this PRD does not yet say what replaces it. Without an answer, "internal
admin login" (V1 Scope, item 1) has no way to get its first set of
credentials. This needs to be decided before backend work starts. Candidate
approaches, roughly in order of how much they cost to build:

1. **Backend seed/migration only** — an engineer inserts admin rows directly
   via a database migration or a one-off seed script. No runtime code path
   creates admins at all. Cheapest, smallest attack surface, and consistent
   with V1 being intentionally lean — but every new admin (including the
   first `ops_admin`) needs someone with DB or deploy access to add a row.
2. **Bootstrap CLI command** — the backend ships a command runnable inside the
   deployed environment (gated behind the same access engineers already need
   to deploy) that creates or promotes an internal admin account. Slightly
   more repeatable and auditable than a raw seed script, still no new HTTP
   surface.
3. **One-time bootstrap endpoint + shared secret** — a protected
   `POST /v1/internal/auth/bootstrap` that only works when called with a
   pre-shared secret from an env var, used once to create the first
   `super_admin`. From there, `super_admin`s could invite/create other
   admins through a small authenticated endpoint. This is real product
   surface area (new endpoint, new auth path, secret management) that V1 was
   explicitly trying to avoid taking on — it starts to look like the
   "admin-user management UI" this PRD deliberately deferred, just without
   the UI.

Recommendation: start with option 1 (seed/migration) for V1, since the
expected number of internal admins is small and the whole point of V1 is to
avoid building admin-management tooling before there's a real need for it.
Revisit if/when the number of admins or the frequency of onboarding new ones
makes a manual DB step genuinely painful — at that point, option 3 becomes
the natural "V2" scope, alongside the "Admin-user management UI" already
listed under Out of Scope.

## Out of Scope

- Full subscriptions, invoices, customers, and support investigation console
- Refund and payout execution
- Merchant impersonation
- Advanced analytics or BI dashboards
- Internal comments/notes system
- Admin-user management UI
- Fine-grained multi-role hierarchy beyond `super_admin` and `ops_admin`
- SSO as a required dependency for V1
- A separate frontend repo or separate web application

## Further Notes

This feature should be built as **one frontend, multiple surfaces**, which
matches the direction already documented for this repo. The internal admin
surface is another surface, but it has a different trust boundary from merchant
routes and must be treated that way in auth, routing, and API design.

The biggest mistake would be to bolt this onto the merchant dashboard as a few
"special admin pages." That would blur trust boundaries and create long-term
security and maintainability problems.

`docs/architecture.md` currently documents four surfaces (Marketing, Dashboard,
Checkout, Portal) in its "One Frontend, Multiple Surfaces" section and its
Trust Boundaries table. When this feature is scheduled for implementation,
that doc should gain a fifth row for Internal Admin (credential: dedicated
internal admin session cookie, path-scoped; travels: browser -> Start ->
internal backend cookie forwarding) so it stays the accurate map of the
system rather than drifting out of sync the moment this ships.

The biggest scope mistake would be to start with a full support console. The
highest-value first cut is merchant management plus fee configuration plus
auditability. That is the smallest version that makes SubPilot more operable as
a platform.
