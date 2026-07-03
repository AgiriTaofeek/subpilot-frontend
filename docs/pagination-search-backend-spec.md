# Backend Spec — Pagination Query Params for List Endpoints

This is a request for additive query-param support on 7 existing list
endpoints. It does **not** change any response shape — the pagination
envelope every endpoint already returns is correct and complete. What's
missing is the ability to filter/search *before* pagination happens, which
is why the frontend currently has to fetch every page of an endpoint and
filter client-side instead of asking the backend for just the page it needs.

## Why this is needed

Today, `GET /v1/customers`, `/v1/plans`, `/v1/subscriptions`, `/v1/invoices`,
`/v1/events`, `/v1/audit-logs`, and `/v1/webhooks/deliveries` each return a
correct single page of results, but none of them accept a free-text search
param, and several are missing filter params the frontend UI already offers
(as client-only, non-persisted filtering over a fully-fetched dataset). That
means the frontend can't actually ask for "page 3 of customers matching
'acme'" — it has to fetch every customer, filter in memory, then slice.
That gets more expensive (and eventually wrong, once `MAX_PAGES` — the
frontend's current safety cap — is hit) as data grows.

Once these params exist, the frontend will switch each route to true
server-side pagination: one request per page, with the filters/search baked
into that request. No frontend work is needed from you beyond what's below —
this doc only covers the API contract.

## Existing response contract — confirmed correct, no changes needed

Every endpoint below already returns Spring Data's standard `Page<T>` shape
**automatically**, just by returning `Page<T>` from the controller
(`return ResponseEntity.ok(page)`) — this isn't something to build, it's
what you already get for free. Restating it here so it's explicit and
doesn't get accidentally changed or trimmed while adding the new params
below. (Yes, a few of these fields — `numberOfElements`, `empty`, `first` —
are arithmetically derivable from `content`/`number` alone, and `totalPages`/
`last` from `totalElements`/`size`/`number`. Not worth hand-rolling a
slimmer DTO to drop them — that would be extra work for you to save the
frontend a one-line calculation.)

| Field             | Type    | Notes                                    |
| ------------------ | ------- | ----------------------------------------- |
| `content`          | array   | The page's records                       |
| `totalElements`     | integer | Total record count across all pages      |
| `totalPages`        | integer | Total number of pages                    |
| `size`              | integer | Requested page size                      |
| `number`            | integer | Current page index (0-based)             |
| `numberOfElements`  | integer | Records actually in this page            |
| `first`             | boolean | Whether this is the first page           |
| `last`              | boolean | Whether this is the last page            |
| `empty`             | boolean | Whether the page has zero records        |

## Per-endpoint asks

### 1. `GET /v1/customers`

Currently accepts: `page`, `perPage`.

Add: `q` — free-text search across `fullName`, `email`, `phone`. Case-
insensitive partial match (e.g. Postgres `ILIKE '%term%'` or equivalent).

### 2. `GET /v1/plans`

Currently accepts: `page`, `perPage`.

Add:
- `q` — free-text search on `name`.
- `status` — filter by `draft` / `published` / `archived`.
- Sort support (see "Sorting" below) — the UI has a column-sort control
  (`name`, `amountKobo`, `trialDays`, `status`, asc/desc) that's currently
  client-side only.

### 3. `GET /v1/subscriptions`

Currently accepts: `page`, `size`, `status`, `planId`.

Add:
- `q` — free-text search across the *customer's* `fullName`/`email` for
  that subscription (requires a join to `customers` — this is the one
  search param here that isn't a plain column match).
- `customerId` — exact-match filter. Needed so the customers list page can
  fetch one customer's subscriptions without pulling every subscription in
  the merchant account. (This gap was already noted in the frontend code as
  a known workaround — see the comment in `getCustomerDetail`,
  `src/lib/api/customers.ts`.)

### 4. `GET /v1/invoices`

Currently accepts: `page`, `size`, `status`.

Add: `q` — free-text search across `invoiceNumber` and the related
customer's `email`.

(Note: `subscriptionId` filtering on this endpoint was already specified in
an earlier round — this doc only adds `q` on top of whatever that spec
already covers.)

### 5. `GET /v1/events`

Currently accepts: `page`, `size`, `type`, `subscriptionId`.

Add: `q` — free-text search across `subscriptionId` and `resourceId` (that's
what the frontend's current client-side search matches against, in
`src/routes/_dashboard/events.tsx`).

### 6. `GET /v1/audit-logs`

Currently accepts: `page`, `perPage`, `resourceType`, `resourceId`, `action`.

Add: `q` — free-text search across `resourceId` and `actorId` (that's what
the frontend's current client-side search matches against, in
`src/routes/_dashboard/settings/audit-log.tsx`).

### 7. `GET /v1/webhooks/deliveries`

Currently accepts only `page`, `size` — no filters at all today, even
though the frontend UI already has three filter controls for this list.

Add:
- `status` — `succeeded` / `pending` / `failed`.
- `endpointId` — exact-match filter.
- `eventType` — exact-match filter.

(No `q` requested here — the existing three filters cover what the UI
needs.)

## Sorting (recommended, not just for `/v1/plans`)

Right now every endpoint takes plain `int page` / `int size` (or `perPage`)
params and builds `PageRequest.of(page, size)` manually with no sort
support. Recommend switching these controller methods to accept a
`Pageable pageable` parameter (via `PageableHandlerMethodArgumentResolver`,
Spring's default when the param type is `Pageable`) instead of separate
primitives. That gets you `?sort=field,direction` (repeatable for multi-
field sort) working for free, on every endpoint, with no extra per-endpoint
code — and it's the one concrete ask here that unlocks `/v1/plans`' sort
UI specifically, since that's the only route with a sort control today.

This is a suggestion, not a blocker — if it's a bigger lift than the filter
params above, the filter/search params matter more and can ship first.

## Known naming inconsistency (flagging, not asking you to fix)

Page-size param name differs across endpoints: `customers`, `plans`, and
`audit-logs` use `perPage`; `subscriptions`, `invoices`, `events`, and
`webhooks/deliveries` use `size`. Not worth a breaking rename for existing
consumers — just flagging it so it's a known, intentional inconsistency
rather than something that gets "fixed" accidentally in this round of
changes.

## What the frontend will do once this ships

See `docs/pagination-frontend-changes.md` for the exact frontend-side change
per route. Short version: each route switches from "fetch every page, filter
in memory" to "fetch one page per request, with `q`/filters as query params"
— using TanStack Table's `manualPagination`/`manualFiltering` mode. No
further backend changes needed for that migration once the params above
exist.
