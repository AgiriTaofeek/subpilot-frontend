# Frontend Changes — Server-Side Pagination Cutover

This is the frontend-side companion to `docs/pagination-search-backend-spec.md`.
Each route below is currently client-paginated (fetches every backend page
via `fetchAllPages()`, then filters/paginates in memory). Once that route's
backend params from the spec doc exist, this is exactly what changes.

**Nothing in this doc has been implemented yet** — it's blocked on the
backend spec shipping. This is the reference to work from once it does,
route by route (each is independent — they don't need to land together).

## The shared pattern, once backend support exists

For every route:

1. Replace the `fetchAllPages`-backed server function (in `src/lib/api/*.ts`)
   with one that takes `{ page, size, q, ...filters }` and makes a single
   backend request per call — no more looping until `last: true`.
2. In the route component, swap the table's config from client-side
   pagination to server-driven:
   ```ts
   const table = useReactTable({
     data: page.content,
     columns,
     manualPagination: true,
     manualFiltering: true,
     pageCount: page.totalPages,
     getCoreRowModel: getCoreRowModel(),
     state: { pagination: { pageIndex: search.page - 1, pageSize: PAGE_SIZE } },
     onPaginationChange: (updater) => { /* same navigate() wiring as today */ },
   });
   ```
   Drop `getPaginationRowModel` — the table no longer slices anything itself.
3. The URL search-param schema (`page`, `q`, filters) and the `Pagination`
   component JSX block already in every route stay exactly as they are —
   only where the data comes from changes, not the pagination UI or the URL
   shape.
4. The query needs `page`/`q`/filters as part of its `queryKey` (they
   currently aren't, since filtering happens after the query resolves) so
   changing a filter triggers a new fetch instead of re-filtering stale data.

## Per-route changes

### `customers/index.tsx` + `src/lib/api/customers.ts`

- Blocked on: `q` on `/v1/customers`, `customerId` filter on
  `/v1/subscriptions` (see backend spec #1, #3).
- `listCustomerSummaries` currently fetches *all* customers and *all*
  subscriptions to build `subscriptionSummary` per customer. Change to:
  fetch one page of customers (with `q`), then for just that page's
  customer IDs, fetch their subscriptions via `GET /v1/subscriptions?
customerId=...` per customer (parallel `Promise.all`, ≤10 calls instead of
  fetching every subscription in the account).
- Drop the current client-side `compareCustomers` sort (most-recently-active
  first) — once paginated server-side, that derived sort isn't available
  without also asking backend to compute and sort on it, which isn't in
  scope here. Default order becomes whatever the backend returns (likely
  `createdAt` once `Pageable`/sort support lands — see backend spec).

### `plans/index.tsx` + `src/lib/api/plans.ts`

- Blocked on: `q`, `status` on `/v1/plans`, plus `Pageable` sort support for
  the existing `sort`/`order` UI control (backend spec #2 + Sorting
  section).
- `listPlans` takes `{ page, q, status, sort, order }` and forwards them
  directly as query params — no more client-side `sortPlans`/`comparePlans`
  once sort is server-driven.

### `subscriptions/index.tsx` + `src/lib/api/subscriptions.ts`

- Blocked on: `q` on `/v1/subscriptions` (backend spec #3).
- `status` and `planId` filters already work server-side today — those can
  be wired to the request immediately, `q` waits for backend.
- `listSubscriptionSummaries` currently fetches all subscriptions + all
  customers + all plans to enrich `customerName`/`planName`. Change to:
  fetch one page of subscriptions, collect that page's unique
  `customerId`s/`planId`s, resolve each via the existing single-entity
  `GET /v1/customers/{id}` / `GET /v1/plans/{id}` endpoints in parallel.
- The current fixed `compareSubscriptions` ranking (past_due pinned first,
  then active-by-next-billing, else createdAt desc) is custom business
  logic, not a plain column sort — it can't move to the backend via the
  generic `Pageable` sort mechanism. Decide explicitly whether to drop the
  "past_due always first" behavior once server-paginated, or ask backend
  for a dedicated `sort=priority`-style value that encodes this rule
  server-side. Worth a product call before implementing, not an
  engineering default.

### `invoices/index.tsx` + `src/lib/api/invoices.ts`

- Blocked on: `q` on `/v1/invoices` (backend spec #4).
- `status` filter already works server-side today.
- Same per-page targeted-lookup change as subscriptions: resolve
  `customerName`/`planName` for just the current page's invoices instead of
  fetching every customer/subscription/plan via `fetchInvoiceJoinData()`.
- Fixed `createdAt desc` sort is already the backend's natural order once
  `Pageable` defaults to it — no special handling needed.

### `events.tsx` + `src/lib/api/events.ts`

- Blocked on: `q` on `/v1/events` (backend spec #5).
- `type` filter (`eventType` in the UI) already works server-side today.
- Simplest route to cut over — flat list, no joins.

### `settings/audit-log.tsx` + `src/lib/api/audit-logs.ts`

- Blocked on: `q` on `/v1/audit-logs` (backend spec #6).
- `action` filter already works server-side today (`resourceType`/
  `resourceId` also supported but not currently exposed as UI filters on
  this route).
- Flat list, no joins — same complexity as events.

### `webhooks/deliveries.tsx` + `src/lib/api/webhooks.ts`

- Blocked on: `status`, `endpointId`, `eventType` filters on
  `/v1/webhooks/deliveries` — currently has *zero* filter support server-
  side (backend spec #7).
- This route doesn't use `useReactTable` today (hand-written table +
  manual `.slice()` pagination) — the cutover here means adding
  `manualPagination`-equivalent manual page-fetching (or adopting
  `useReactTable` with `manualPagination: true` to match the other 6 routes
  for consistency) instead of retrofitting the existing manual-slice code.
- The `eventType` filter's option list is currently derived client-side
  from `Array.from(new Set(deliveries.map(d => d.eventType)))` over the
  full dataset — once paginated, that can't enumerate all event types from
  one page. Either hardcode the known event-type list, or add a small
  "distinct event types" endpoint/field if the option list needs to stay
  dynamic. Decide before implementing.

## What doesn't change

- `PageResponse<T>` (`src/types/api.ts`) — already the correct shape.
- The `Pagination`/`PaginationContent`/`PaginationItem`/`PaginationLink`/
  `PaginationNext`/`PaginationPrevious` JSX block already present in every
  route — same markup, same `from`/`search`/`resetScroll` wiring.
- The URL search-param schema shape (`page`, `q`, filters) per route.
- `fetchAllPages()` (`src/lib/api/pagination.ts`) itself isn't deleted —
  it's still the right tool for genuinely small, unfiltered lists (e.g.
  dunning campaigns, API keys) that don't need real pagination at all.
