# Backend Spec — Internal Admin Dashboard

This is the implementation-focused version of `docs/internal-admin-prd.md`,
written for whoever is building the backend side of this feature. It skips
the product narrative (personas, user stories, page-by-page UI flow) and
leads with what you actually need: the auth model, the API contract, the
permission rules, and the open question that blocks you from starting.

If you want the "why" behind any of this — who uses it, what the pages look
like, why V1 is scoped the way it is — that's in the full PRD. This doc
should be enough on its own to start implementing.

## The one open question, answered before anything else

**How do the first internal admin accounts get created?** There is
deliberately no admin-management UI in V1 (see Out of Scope), which means
nothing in this spec creates an admin account through the API. Something
still has to put the first row in the table, or `POST /v1/internal/auth/login`
has nothing to validate against.

This is your call, since it's about what's practical given how you deploy and
access the database — not a frontend or product decision. Three options,
cheapest first:

1. **DB migration / seed script** — you insert admin rows directly, no runtime
   code path creates them at all. Simplest, smallest surface area, but every
   new admin needs someone with DB or deploy access.
2. **Bootstrap CLI command** — a command runnable in the deployed environment
   that creates/promotes an admin. Same access requirement as #1, more
   repeatable and auditable.
3. **One-time bootstrap endpoint + shared secret** — `POST
   /v1/internal/auth/bootstrap` gated by an env-var secret, used once for the
   first `super_admin`, who can then create others via a small endpoint. Real
   new surface area (new endpoint, new secret to manage) — this is
   effectively the admin-management feature V1 was trying to avoid building,
   just without a UI.

Recommendation is #1 for V1 — revisit only once manual onboarding is actually
a recurring pain. Pick whichever fits how you already manage this
environment and let the frontend side know, since it changes nothing about
the API contract below either way.

## Auth Model

This is a **separate internal admin surface**, not merchant auth with an
extra role check bolted on. Internal admin sessions must not share the
cookie/session contract that merchant sessions use today.

Required endpoints:

- `POST /v1/internal/auth/login`
- `POST /v1/internal/auth/logout`
- `GET /v1/internal/auth/me`

Expected behavior:

- login validates an internal admin account and sets a dedicated internal
  admin session cookie
- `me` returns the currently authenticated internal admin identity
- logout clears the internal admin session cookie
- **merchant cookies must not authenticate internal routes, and internal
  admin cookies must not authenticate merchant routes.** This needs to be
  enforced server-side — don't rely on the frontend only ever sending the
  right cookie to the right place.

As defense in depth on top of that server-side check, set the internal admin
cookie with `Path=/internal` (or whatever the internal route prefix ends up
being) so the browser itself doesn't attach it to merchant or checkout
requests. Today's merchant cookies (`_subpilot_session`, `_subpilot_refresh`,
`_subpilot_csrf`) are implicitly scoped to the whole app because there's only
one auth surface — that stops being true once this ships, so path-scoping
matters here in a way it didn't before.

`GET /v1/internal/auth/me` response:

| Field         | Type   | Notes                              |
| ------------- | ------ | ----------------------------------- |
| `adminId`     | string | Stable internal admin identifier   |
| `email`       | string | Internal admin email               |
| `role`        | string | `super_admin` or `ops_admin` in V1 |
| `displayName` | string | Safe display label for the UI      |

## API Contract

All internal endpoints live under `/v1/internal/*`, separate from the
existing merchant-tenant-scoped API.

### 1. Merchant Directory

- `GET /v1/internal/merchants`
- `GET /v1/internal/merchants/{merchantId}`

`GET /v1/internal/merchants` must support: search by business name, email,
merchant ID, slug; filter by status; pagination; stable sorting.

Merchant list response fields:

| Field          | Type            | Notes                                     |
| -------------- | --------------- | ------------------------------------------ |
| `merchantId`   | string          | Primary key shown in internal tooling     |
| `businessName` | string          | Merchant display name                     |
| `email`        | string          | Merchant account email                    |
| `slug`         | string          | Public merchant slug when available       |
| `status`       | string          | `active`, `under_review`, or `suspended`  |
| `feeSource`    | string          | `platform_default` or `merchant_override` |
| `createdAt`    | datetime string | For sorting and context                   |
| `updatedAt`    | datetime string | For recency and audit context             |

Merchant detail response fields:

| Field                    | Type            | Notes                                        |
| ------------------------ | --------------- | ---------------------------------------------- |
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

Note the `Minor` suffix on fee fields — that matches the existing
`MerchantFeeRateDto.feeFixedMinor` naming already in the frontend's API types
(`src/types/api.ts`), not a `Kobo` suffix. Keep that convention for anything
new so the two fee representations don't drift apart.

### 2. Platform Fee Configuration

- `GET /v1/internal/fees/default`
- `PATCH /v1/internal/fees/default`

`GET` response:

| Field              | Type            | Notes                                          |
| ------------------ | --------------- | ------------------------------------------------ |
| `feeBps`           | integer         | Percentage fee in basis points                 |
| `fixedFeeMinor`    | integer         | Fixed fee, in minor currency units (e.g. kobo) |
| `updatedAt`        | datetime string | Last time policy changed                       |
| `updatedByAdminId` | string or null  | Who last changed it                            |

`PATCH` request:

| Field           | Type    | Notes                      |
| --------------- | ------- | --------------------------- |
| `feeBps`        | integer | New default percentage fee |
| `fixedFeeMinor` | integer | New default fixed fee      |
| `reason`        | string  | Required for audit logging |

Rules: only `super_admin` can call this; validate numeric ranges; write an
audit record with old and new values.

### 3. Merchant-Specific Fee Override

- `GET /v1/internal/merchants/{merchantId}/fees`
- `PATCH /v1/internal/merchants/{merchantId}/fees`
- `DELETE /v1/internal/merchants/{merchantId}/fees`

`GET` response:

| Field                           | Type            | Notes                                        |
| ------------------------------- | --------------- | ----------------------------------------------- |
| `feeSource`                     | string          | `platform_default` or `merchant_override`    |
| `platformDefaultFeeBps`         | integer         | Current global default                        |
| `platformDefaultFixedFeeMinor`  | integer         | Current global default                        |
| `overrideFeeBps`                | integer or null | Merchant override if present                  |
| `overrideFixedFeeMinor`         | integer or null | Merchant override if present                  |
| `effectiveFeeBps`               | integer         | Final fee the merchant currently uses         |
| `effectiveFixedFeeMinor`        | integer         | Final fixed fee the merchant currently uses   |

`PATCH` request:

| Field                   | Type    | Notes                             |
| ----------------------- | ------- | ------------------------------------ |
| `overrideFeeBps`        | integer | Merchant percentage fee override  |
| `overrideFixedFeeMinor` | integer | Merchant fixed fee override       |
| `reason`                | string  | Required for audit logging        |

`DELETE`: removes the override, merchant falls back to platform default.
Needs an audit reason — pick one explicit shape (body or query param) and
tell the frontend which, since the PRD deliberately left this open.

Rules: only `super_admin` can create/update/remove overrides; return the
effective fee after every mutation; write an audit record for every write.

### 4. Merchant Status Management

- `PATCH /v1/internal/merchants/{merchantId}/status`

Request:

| Field    | Type   | Notes                      |
| -------- | ------ | --------------------------- |
| `status` | string | Target status              |
| `reason` | string | Required for audit logging |

Statuses: `active`, `under_review`, `suspended`.

Allowed transitions:

| From           | To             |
| -------------- | -------------- |
| `active`       | `under_review` |
| `under_review` | `active`       |
| `under_review` | `suspended`    |
| `suspended`    | `active`       |

Enforce these transitions server-side; reject anything else with a clear
validation/business error, not a generic failure; write an audit record with
previous status, new status, actor, and reason.

Whether `ops_admin` can call this at all (vs. `super_admin`-only) is a real
open call the business needs to make — see Permission Model below.

### 5. Audit Log

- `GET /v1/internal/audit`

Filterable by: merchant ID, actor admin ID, action type, date range.

Response fields:

| Field          | Type            | Notes                                                                                                                        |
| -------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `auditId`      | string          | Stable audit identifier                                                                                                       |
| `actorAdminId` | string          | Admin who performed the action                                                                                                |
| `actorEmail`   | string          | Useful for UI review                                                                                                          |
| `targetType`   | string          | For V1 mainly `merchant` or `platform_fee_policy`                                                                            |
| `targetId`     | string          | Merchant ID or policy identifier                                                                                              |
| `actionType`   | string          | e.g. `merchant_status_changed`, `platform_fee_updated`, `merchant_fee_override_updated`, `merchant_fee_override_removed`     |
| `oldValue`     | object          | Structured previous state                                                                                                     |
| `newValue`     | object          | Structured next state                                                                                                         |
| `reason`       | string          | Required mutation reason                                                                                                      |
| `createdAt`    | datetime string | Audit timestamp                                                                                                               |

**This is a new endpoint, not an extension of the existing merchant-facing
`GET /v1/audit-logs`** (`AuditLogDto` in `src/types/api.ts`). That existing
type requires a non-null `merchantId` on every record and its `actorType` is
`"user" | "api_key"` — it assumes the actor is always one merchant's user or
API key. A platform-fee-policy change has no single merchant, and an internal
admin is neither of those actor types, so reusing that endpoint would mean
loosening a contract other merchant tooling depends on being tenant-scoped.
Keep this as its own endpoint and shape.

## Permission Model

Two roles in V1, kept deliberately simple:

**`super_admin`** can: log in, view merchant list/detail, change platform
default fees, create/update/remove merchant fee overrides, change merchant
status, view audit log.

**`ops_admin`** can: log in, view merchant list/detail, view audit log, and
change merchant status *if* the business decides that's allowed in V1.
Cannot change platform default fees or touch fee overrides — that's
`super_admin` only, no exceptions.

If the business wants status changes to be `super_admin`-only too, that's
fine — just make sure frontend and backend agree on one explicit rule rather
than each assuming.

## Error Expectations

Return explicit errors for expected failure cases, not generic `500`s:

- `401` — no valid internal admin session
- `403` — authenticated but lacks permission
- `404` — merchant does not exist
- `409` or `422` — invalid status transition or invalid fee-change request

## Data Modeling

No specific schema required by this spec, but you need clear storage for:
internal admin accounts, internal admin roles, merchant operational status,
platform default fee policy, merchant-specific fee overrides, and audit
records for internal admin mutations.

One modeling rule that matters for the frontend: **always return the
effective fee directly** on merchant detail and fee endpoints. Don't make the
frontend compute "is this the override or the default" itself from two
separate values — that logic should live once, on your side.

## What the frontend needs from you

The frontend calls these endpoints through TanStack Start server functions
with a cookie-based session, the same pattern the merchant dashboard already
uses. Concretely, that means:

- stable DTOs that map directly to list/detail screens, not raw internal
  models
- mutation endpoints return the new canonical state after a write, so the UI
  can refresh without a second round trip
- permission checks happen server-side even though the UI will also hide
  buttons the current role can't use — don't trust the client
- every fee and status mutation writes a durable audit record, unconditionally

The frontend is also building its own separate request helper for
`/v1/internal/*` (it can't reuse the merchant one — that one auto-retries
401s against the merchant refresh endpoint specifically, which would be wrong
here). You don't need to do anything about that; it's mentioned so you know
why "internal admin cookies must not authenticate merchant routes" is a hard
requirement rather than a nice-to-have — the frontend isn't fully insulating
you from cookie mixups on its own.

## Testing Expectations

- Auth: internal admin can access internal routes; merchant sessions cannot;
  expired internal sessions fail/redirect correctly.
- Authorization: `ops_admin` can view merchants and manage status if that's
  enabled; only `super_admin` can touch fee policy.
- Merchant directory: search, filter, pagination, detail fetch all work.
- Fees: default updates, override create/update/remove, correct
  effective-fee resolution, reason required on every mutation.
- Status: valid transitions succeed, invalid ones are rejected, reason
  required.
- Audit: every sensitive action records actor, merchant, old value, new
  value, reason, timestamp.
- End-to-end smoke test: login → search merchant → open detail → update fee
  override → change status → confirm audit entries exist for both mutations.

## Out of Scope for V1

Don't build these yet — they're explicitly deferred:

- Full subscriptions/invoices/customers support console
- Refund or payout execution
- Merchant impersonation
- Advanced analytics or BI dashboards
- Internal notes/comments system
- Admin-user management UI (see the open question above for what replaces it
  in V1)
- Multi-role hierarchy beyond `super_admin` / `ops_admin`
- SSO as a required dependency

## Full context

Personas, user stories, page-by-page UI flow, and the frontend routing/shell
decisions live in `docs/internal-admin-prd.md` if you want the product
reasoning behind any of the above.
