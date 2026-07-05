# TanStack Start Request Lifecycle (server internals, middleware, and the BFF)

This document walks through exactly what happens between a browser request landing on
this app and a fully hydrated page: what the server actually *is*, how it decides what
kind of request it's looking at, where middleware runs, `beforeLoad`/`loader`
ordering, streaming, and client hydration — then shows how our BFF layer
(`backendRequest` in [src/lib/api/backend.ts](../src/lib/api/backend.ts)) plugs into
that same lifecycle.

For *why* we chose a BFF at all, see [frontend-bff-architecture.md](frontend-bff-architecture.md).
This doc is the *mechanical* companion to that one.

**Sourcing note:** the middleware/dispatch sections below are read directly out of the
installed package source
(`node_modules/@tanstack/start-server-core/dist/esm/createStartHandler.js` and
`server-functions-handler.js`, resolved to `@tanstack/start-server-core@1.169.15` in
this repo's lockfile), not paraphrased from prose docs, specifically so there's no
ambiguity about ordering. Everything else is cross-checked against this repo's own
[src/router.tsx](../src/router.tsx), [src/routes/__root.tsx](../src/routes/__root.tsx),
and [src/integrations/tanstack-query/root-provider.tsx](../src/integrations/tanstack-query/root-provider.tsx).

---

## 0. What "the TanStack Start server" actually is

There is no separate "Start server" process distinct from your Vite/Nitro build. Look
at [vite.config.ts](../vite.config.ts): the `nitro()` plugin and `tanstackStart()`
plugin both plug into the *same* Vite dev/build pipeline. In this repo,
`package.json` pins `"nitro": "npm:nitro-nightly@latest"` — **Nitro is the actual HTTP
server runtime**. TanStack Start does not invent its own server; it hands Nitro a
single request-handling entry point (`createStartHandler`) and Nitro is what actually
binds to a port, receives raw HTTP requests, and calls that handler.

So "hitting the TanStack Start server" concretely means: Nitro receives the request →
calls the one function `createStartHandler` produced → that function decides
everything else (page render vs RPC vs API route) internally, in plain JS, using the
same `routeTree` your `router.tsx` builds.

### The runtime is different in dev vs. production — same code, different process

This matters for "where does this actually execute," so it's worth being literal about
it rather than treating "the server" as one abstract thing:

- **`pnpm dev`** (`SKIP_CLOUDFLARE_VITE_PLUGIN=true vite dev`): the comment at the top
  of [vite.config.ts](../vite.config.ts) explains why — `@cloudflare/vite-plugin`'s
  dev-server integration currently crashes on startup against this Vite version, and
  since this app uses no real Workers bindings (KV/D1/R2/Durable Objects) today, that
  integration isn't load-bearing locally. So in dev, the Cloudflare plugin is skipped
  entirely and `createStartHandler` runs inside a **plain Node.js process** — the same
  Node process running Vite's own dev server. `getRequestHeader`, `backendRequest`'s
  `fetch`, everything in section 6 — all of it is ordinary Node code during `pnpm dev`.
- **Production** (`pnpm deploy` → `wrangler deploy`): [wrangler.jsonc](../wrangler.jsonc)
  points `main` at `@tanstack/react-start/server-entry` and sets
  `compatibility_flags: ["nodejs_compat"]`. The deployed artifact runs inside a
  **Cloudflare Workers V8 isolate, not Node** — `nodejs_compat` polyfills enough of
  Node's built-ins for code written against Node assumptions to still run, but it is a
  fundamentally different runtime (no real filesystem, no long-lived process state
  across requests, different timer/streaming semantics). One caveat worth flagging
  plainly rather than glossing over: running `pnpm build` locally and inspecting
  `.output/nitro.json` shows Nitro picked its `node-server` preset for that build
  artifact, not a Cloudflare-specific one — the exact hand-off between Nitro's preset
  system and `@cloudflare/vite-plugin` for the artifact `wrangler deploy` actually ships
  is a layer I haven't fully traced, so treat "runs as a Workers isolate in production"
  as the verified, load-bearing fact (from `wrangler.jsonc` + the compatibility flag),
  not the specific build-pipeline mechanics that get you there.

Either way, `createStartHandler` itself — the dispatch logic in section 1, the
middleware in section 2, `router.load()` in sections 4–6 — is identical code. What
changes is only the process it runs inside.

## 1. Dispatch: how one request becomes "a page load" vs "an RPC call" vs "an API route"

Inside `createStartHandler`'s request resolver, the very first branch is a plain
string check:

```js
if (SERVER_FN_BASE && url.pathname.startsWith(SERVER_FN_BASE)) {
  // → server function RPC path
}
// else → page / API route path
```

`SERVER_FN_BASE` is a path prefix baked in at build time (an internal, reserved
prefix the compiler generates — not something you route to yourself). There is no
content negotiation, no header sniffing, no "is this a fetch() vs a navigation" magic:
**the URL prefix alone decides which of the two completely separate code paths a
request takes.**

- **Server-fn path:** the segment right after the prefix is the compiled function's
  ID (`serverFnId`). The handler looks that function up (`getServerFnById`), runs the
  **global request middleware**, then hands off straight to `handleServerAction`,
  which deserializes the payload/context and calls the actual compiled function body.
  **The app's route tree is never consulted on this path.** No `beforeLoad`, no
  `loader`, no route matching — a server-fn call has nothing to do with which page
  you're "on."
- **Page/API path** (`handleServerRoutes`): the pathname is matched against the exact
  same `routeTree` from `router.tsx`. This is the path that eventually reaches
  `beforeLoad` → `loader` → render (sections 4–6 below). It's also the path that
  serves file-based **API/server routes** (`createFileRoute(...)({ server: { handlers: {...} } })`)
  if a matched route defines them — this repo doesn't currently define any (checked:
  no route under `src/routes/` has a `server` handlers block), so every request here
  either goes through a server-fn RPC call or a normal page render, never a raw API
  route.

Every call our client code makes to a `createServerFn`-produced function — e.g.
`listCustomerSummaries()` from [src/data/customers.ts](../src/data/customers.ts) — is
compiled by the TanStack Start plugin so that, on the client, invoking it does a
`fetch` to `SERVER_FN_BASE + <that function's id>`. Client code never calls the actual
handler body directly, even though it reads like a normal async function call.

## 2. Where middleware actually fits

**Executes in: server only, always.** This is worth stating before anything else —
unlike `beforeLoad`/`loader` (sections 5–6), which are isomorphic and genuinely run in
two different JS environments over a page's lifetime, request middleware and
route-level middleware have no client-side existence at all. There is no browser build
of `src/start.ts`, no scenario where a global request middleware's code ships to or
runs in the browser. It only ever executes inside whichever process section 0 just
described (Node in dev, the Workers isolate in prod). Server function middleware
(2c below) is the one exception, and precisely because its call *site* is isomorphic —
see its own note below.

There are **three distinct middleware layers** in Start, and they are easy to
conflate. Reading straight out of `createStartHandler.js`:

### a) Global request middleware — `src/start.ts`, every request

```ts
// src/start.ts (this repo does not have this file yet)
export const startInstance = createStart(() => ({
  requestMiddleware: [someMiddleware],
}));
```

This runs **first, before dispatch-specific logic** — before the code even branches
on server-fn-vs-page. Literally: `executeMiddleware([...flattenedRequestMiddlewares, terminalHandler])`
wraps *both* the server-fn path and the page/API path. If you don't define
`src/start.ts`, Start silently falls back to a single default: a same-origin CSRF
check scoped to `handlerType === 'serverFn'` (verified via `Sec-Fetch-Site`/`Origin`/
`Referer` headers) that protects the RPC endpoint from cross-site calls. **This repo
has no `src/start.ts`**, so that default CSRF middleware is the only global middleware
currently active — there is no custom one.

### b) Route-level server middleware — `server: { middleware }` on a route

```ts
// example, not present in this repo
export const Route = createFileRoute("/dashboard")({
  server: { middleware: [authMiddleware] },
});
```

This only exists on the **page/API path** (`handleServerRoutes`). It runs *after*
global request middleware, is collected from every matched route in the branch (like
`beforeLoad`, parent-inclusive), and runs *before* that route's API handler (if any)
or the SSR render. **A server-fn RPC call never passes through this layer at all** —
route-level middleware is keyed to the URL you navigated to, and RPC calls don't go
through route matching (see section 1). **This repo defines none of these either** —
grepping `src/routes/` for `server: { middleware` returns nothing.

### c) Server function middleware — `.middleware([...])` on `createServerFn()`

```ts
// example, not present in this repo
const authed = createServerFn().middleware([requireAuthMiddleware]).handler(...)
```

This is the odd one out: it isn't part of `createStartHandler`'s request-middleware
pipeline at all. It's compiled *into* the server function itself, and runs inside
`handleServerAction`'s call to the compiled `action(params)` — i.e., scoped to that one
RPC call, not to "the request" in general. It's also the only layer of the three that
can run logic on *both* sides of the RPC (`.client()` before/after the fetch,
`.server()` on the handler side) — and that's exactly *because* the thing it wraps, a
server function call, is itself isomorphic: the same `createServerFn`-produced
function can be called from code that ends up running server-side (a `loader` during
SSR, section 6) or client-side (a component event handler, a client-triggered
refetch, section 10). `.client()` only ever executes in the browser, wrapping the
`fetch` call itself; `.server()` only ever executes on the server, wrapping the actual
handler — neither one crosses over. It's also the only layer of the three with
`.validator()` for input shapes. **This repo's 59 `createServerFn` calls (grep across
`src/lib/api/`) use zero `.middleware([...])` chains** — every one goes straight to
`.handler(...)`.

### Where this repo's actual cross-cutting logic lives instead

None of the three middleware layers above are wired up here. The things middleware
would typically do — reading the session cookie, attaching a CSRF token, retrying
once on a 401 — are done today as **plain function calls inside each server
function's handler body**, via `backendRequest` in `backend.ts` (see section 5). That
is not TanStack Start middleware; it's this app's own hand-rolled helper, invoked
manually wherever a handler needs the backend. Functionally it achieves some of what
route-level or server-fn middleware would give you, but mechanically it's just a
function call inside the handler, not a pipeline stage the framework runs for you. If
this repo ever wants "every dashboard server function checks the session before
running" without repeating that call everywhere, that's exactly the shape server
function middleware (`.middleware([requireSessionMiddleware])`) exists for — worth
flagging as a concrete future refactor, not a correction of anything currently broken.

## 3. Server: router + `QueryClient` creation (page/API path only)

**Executes in: server only.** This whole section happens inside the process from
section 0 (Node in dev, the Workers isolate in prod) — nothing here runs in the
browser yet; there is no browser involved at this point in the timeline at all.

Once we're past dispatch and middleware, and we're on the page/API path, the request
handler calls our `getRouter()`:

```ts
// src/router.tsx
export function getRouter() {
  const context = getContext(); // new QueryClient, every call
  const router = createTanStackRouter({ routeTree, context, ... });
  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });
  return router;
}
```

**A fresh router *and* a fresh `QueryClient` are created for every single request.**
`getContext()` (in `root-provider.tsx`) does `new QueryClient(...)` with no caching
across calls — deliberate request isolation, so one merchant's cached data can never
leak into another concurrent request's response.

This QueryClient is **a cache (`QueryCache` under the hood), not a `@tanstack/store`
instance** — worth being precise about that distinction if you're teaching this, since
TanStack ships both and they're unrelated primitives.

**This server-side `QueryClient` is a throwaway object, not "the" QueryClient.** It's
created fresh right above (`getContext()`), lives only for the duration of this one
request, and is discarded — genuinely garbage-collected, not reused — the moment the
response finishes streaming. Section 9 creates a **second, entirely separate**
`QueryClient` instance in the browser, in a different process, in a different
language-runtime execution context. The two are never the same object and never
share memory. The only thing connecting them is the serialized cache payload from
section 8 — the client's `QueryClient` starts empty and gets *seeded* from that
payload; it does not "continue" the server's instance in any sense.

`setupRouterSsrQueryIntegration` is what later lets the router's own dehydrate/hydrate
machinery also carry the `QueryClient`'s cache, not just loader return values (section
7).

## 4. Route matching (top-down)

**Executes in: both — but not simultaneously.** This is the router's own matching
logic (`@tanstack/router-core`), and the exact same matching code runs server-side
during the initial SSR pass (this section) and client-side on every subsequent
navigation (section 9/10). It's one shared implementation compiled into both the
server bundle and the client bundle — not two different implementations that happen
to agree.

The router matches the incoming URL against `routeTree.gen.ts`. For each matched
route, in parent-to-child order:

1. `route.params.parse` — validates/parses path params
2. `route.validateSearch` — validates/parses search params

No data fetching happens yet. This step can only reject the URL shape itself.

## 5. `beforeLoad` — serial, parent → child

**Executes in: both — the same function body, run twice, in two different places
over one page's lifetime.** `beforeLoad` on a route definition (e.g.
`src/routes/_dashboard.tsx`) is not server-only code with a client-side stand-in — it's
literally the same JavaScript, bundled into *both* the server build and the client
build. The first time it runs is server-side, during this SSR pass (this section). If
the user later navigates client-side to another route under `/_dashboard`, this exact
same `beforeLoad` runs *again*, this time executing in the browser. Nothing marks it
as "the server version" vs "the client version" — the environment it happens to be
running in at a given moment is what determines what its internal calls actually do
(see the `getMerchantSession` example split between sections 6 and 10). This is why
`_dashboard.tsx`'s own comment about `isUnauthenticatedBackendError` only working
"when this beforeLoad runs server-side during SSR" matters: the *code* is identical
both times, but what a thrown error looks like differs by environment, because it
crossed the RPC boundary in one case (client run) and didn't in the other (server run).

For every matched route, `beforeLoad` runs **serially, parent first**. Each one
receives the merged context of everything above it (which already includes anything
route-level middleware added in section 2b, if this repo used it), and can:

- extend context (e.g. attach a resolved session) for its own `loader` and every
  child route's `beforeLoad`/`loader`
- redirect or throw (auth guards live here)

This is a common misconception worth flagging explicitly: it is **not** "the
`beforeLoad` of that one route" — it's the whole matched branch, top to bottom, before
any `loader` anywhere in that branch starts.

## 6. `loader` — parallel across matched routes, and where the BFF gets called

**Executes in: both, same as `beforeLoad`** — this section describes its first
(server-side) run; section 10 covers the client-side run of this identical code on a
later navigation.

Once every `beforeLoad` in the branch has resolved, `loader`s run — **in parallel**,
not sequentially. This is where our routes reach for data:

```ts
// src/routes/_dashboard/customers/index.tsx
loader: async ({ context }) => {
  await context.queryClient.ensureQueryData(customersListQueryOptions());
}
```

`context.queryClient` here is the same per-request `QueryClient` created in section 3
— it flowed down through router context and is now available in every route's
`loader`.

**This is the first point where the BFF gets involved.** `ensureQueryData` runs the
query's `queryFn`:

```ts
// src/data/customers.ts
export const customersListQueryOptions = () =>
  queryOptions({
    queryKey: ["customers"],
    queryFn: () => listCustomerSummaries(),
  });
```

`listCustomerSummaries` is a `createServerFn` — but note the distinction from section
1: because this call originates *inside a loader that's already running on the
server* (during SSR), it does **not** go over HTTP to `SERVER_FN_BASE` the way a
client-side call would. It's invoked directly as a function call — same process, same
call stack, no network hop, no serialization. It only becomes an actual `fetch` to the
RPC endpoint when something on the *client* calls it later (section 10). This is the
concrete payoff of "environment determines behavior" from section 5: identical source
code (`listCustomerSummaries()`), two entirely different execution paths, decided
purely by whether the surrounding code happens to be running server-side or
client-side at the moment of the call.

Its handler — the part inside `.handler(async () => { ... })` — only ever executes
server-side, regardless of which of the two paths above got it there. That's where the
BFF work happens:

```ts
// src/lib/api/customers.ts
export const listCustomerSummaries = createServerFn({ method: "GET" }).handler(
  async () => {
    const { customers, subscriptionsByCustomerId } = await fetchCustomersAndSubscriptions();
    return customers.map((customer) => ({ /* reshaped, UI-specific fields */ }));
  },
);
```

`fetchCustomersAndSubscriptions` fires two parallel calls to the real backend
(`/v1/customers`, `/v1/subscriptions`) through `backendRequest`, then the handler
merges and reshapes them into exactly the fields the customers table needs. That
merge-and-reshape step — turning two backend REST resources into one UI-shaped
payload — is the textbook definition of a BFF: it's orchestration and presentation
logic, not business logic, and it belongs on this side of the boundary rather than in
the Spring backend or in browser code.

The loader doesn't return until this resolves, which means the route's `component`
won't render until the reshaped data is in the QueryClient cache.

## 7. `component` renders, page streams out

**Executes in: server, for this pass** — this section is the *server* render. Section
9 covers the client doing its own, different kind of render pass over the same
component tree.

Once a route's loader resolves, its `component` can render. The whole tree is wrapped
by the root's `shellComponent`:

```ts
// src/routes/__root.tsx
export const Route = createRootRouteWithContext<MyRouterContext>()({
  shellComponent: RootDocument,
});
```

`RootDocument` renders the actual `<html>`/`<head>`/`<body>` shell, with `<Scripts />`
at the end. TanStack Start streams this: critical content renders and flushes first;
anything wrapped in `defer()`/`<Await>` streams in afterward as it resolves, without
blocking the initial response.

Concretely, "renders" here means React's server-rendering path produces a stream of
**HTML text** — there is no DOM at this point, no event listeners attached, no
`useEffect` running (effects are explicitly a client-only concept; they never run
during a server render). What leaves this process is markup, not a live component
tree. The live component tree gets built for the first time in section 9, when the
browser parses this HTML and React hydrates it.

## 8. Dehydration — packaging state for the client

**Executes in: server only** — this is the last step before anything crosses over to
the browser at all. Everything from here up (sections 3–8) has happened entirely
inside the server process; nothing browser-side exists yet.

Two things get serialized into that streamed HTML:

- Route match state (params, loader data) — dehydrated by the router itself
- The `QueryClient`'s cache — dehydrated because of `setupRouterSsrQueryIntegration`
  from section 3

This is why `ensureQueryData` inside a loader is the right pattern here rather than
just `await`-ing a plain fetch: data that lands in the QueryClient is what actually
gets serialized and handed to the client, with the query key intact, so the client can
find it again as the *same* cache entry rather than a fresh unkeyed blob.

## 9. Client: hydration, not re-fetching

**Executes in: client (browser) only, from here on** — this is the first section
where the browser is actually doing anything. Everything up to and including section 8
happened server-side, in a process that no longer exists by the time this runs (the
request that spawned it has already completed).

The client also calls `getRouter()` once (its **own, separate** fresh `QueryClient` —
see the callout in section 3: this is a different object in a different runtime, not
the server's instance continuing), but for the **initial page**, it does not re-run
`beforeLoad`/`loader`. It rehydrates: the router matches state and the QueryClient
cache are restored from the payload the server serialized in section 8. No duplicate
network round-trip, no refetch, no flash of stale data.

This is also where React's hydration (as opposed to section 7's server render)
happens: React walks the HTML the server already sent down — which is already sitting
in the DOM, parsed by the browser before any of this JS even ran — and *attaches*
itself to those existing nodes: event listeners get wired up, refs get set, `useEffect`
callbacks run for the first time ever for this tree. It is not a fresh render that
throws away and rebuilds the DOM; it's a reconciliation pass against markup that
already exists. If the component tree hydration produces doesn't match what the server
sent (a common source of "hydration mismatch" warnings), that mismatch is only
detectable here, client-side, because the server-rendered string is the only artifact
of section 7 that survived past that process ending.

`beforeLoad`/`loader` run again on the client only when:

- the user navigates to a new route client-side, or
- an already-cached query goes stale per its `staleTime` and something triggers a
  refetch (30s default here, see `root-provider.tsx`)

## 10. Client-side navigation — now it really is an RPC call, and the BFF is still in the loop

**Executes in: client triggers it, server still does the work.** The `beforeLoad`/
`loader` call in this section is running in the browser (same code as sections 5–6,
now executing client-side per that section's callout) — but the moment it calls
`listCustomerSummaries()`, execution crosses back over to the server for the duration
of that one RPC call, then returns to the browser with a plain serialized result. It's
not "the client does the BFF work now" — the BFF (`backendRequest`, Spring) never runs
anywhere but server-side, in either path.

This is where section 1's distinction matters for teaching this correctly:
`createServerFn` is not "a function that only exists on the server and disappears on
the client." It's an **RPC boundary**. When the browser later calls
`listCustomerSummaries()` again — a stale-triggered refetch, or a different route's
loader running client-side — that call is compiled into an actual `fetch` to
`SERVER_FN_BASE + <id>` (section 1), which lands back at `createStartHandler`, takes
the server-fn branch, runs the (default, in this repo) global request middleware, and
invokes the same handler body. The handler body — and everything it touches,
including `backendRequest` — never ships to the browser bundle at all, but it's worth
being precise that two *different* compile-time mechanisms are stacked here, not one:

- `createServerFn`'s own compiler transform is what replaces `listCustomerSummaries`'s
  handler body with the RPC-stub `fetch` call in the client bundle (section 1) — the
  *name* `listCustomerSummaries` still exists client-side, it's just a thin network
  call instead of the real logic now.
- `createServerOnlyFn`, wrapping `backendRequest` specifically in `backend.ts`, is a
  separate, stronger guarantee: `backendRequest` isn't a server function at all and has
  no RPC stub — it's a plain helper that must categorically never be reachable from
  client code, RPC-wrapped or otherwise. The build fails the import-protection check
  (see the comment above `backendRequest`'s definition) if it's reachable from a
  client bundle without this marker, precisely because nothing client-side is ever
  supposed to call it directly — only other server-only code (a `createServerFn`
  handler) calls it, and only on the server side of that handler's own boundary.

So the full path for *any* customer-data request, whether during initial SSR (a plain
function call, section 6) or a client-side refetch three minutes later (a real HTTP
round trip, this section), always bottoms out the same way:

```
Browser (client-side call only)
  └─ fetch → SERVER_FN_BASE + serverFnId              [dispatch: section 1]
       └─ global request middleware (default CSRF check only, today)  [section 2a]
            └─ createServerFn handler (listCustomerSummaries)
                 └─ backendRequest() — forwards cookies, attaches CSRF,
                    retries once on 401 via refresh                    [BFF, section 6]
                      └─ Spring backend (nomba-subpilot.duckdns.org/api)
```

The browser never talks to `nomba-subpilot.duckdns.org` directly, never sees the
backend base URL, and never handles the session cookie's CSRF pairing itself — all of
that is `backendRequest`'s job, and `backendRequest` only exists on the server side of
the `createServerFn` boundary.

---

## Summary: one picture

Every line below happens inside exactly one of two processes — the server process
from section 0 (Node in dev, a Workers isolate in prod) or the browser. The `═════`
divider is the one point where control genuinely crosses that boundary for the first
time; everything above it never touches the browser, everything below it never touches
the original server process (a *new* RPC round trip, section 10, opens its own
separate server-side excursion each time it happens).

```
┌─ SERVER PROCESS ─────────────────────────────────────────────────────────────┐
│ Request in (Nitro is the actual server; Start hands it one entry point)      │
│   → dispatch: url.pathname.startsWith(SERVER_FN_BASE)?          [section 1]  │
│       │                                                                      │
│       ├─ YES → server-fn RPC path (no route tree involved)                  │
│       │         → global request middleware      [2a — default CSRF, here] │
│       │         → handleServerAction → compiled function body               │
│       │              (server-fn middleware, if any, runs inside here) [2c]  │
│       │                                                                      │
│       └─ NO  → page/API path                                                │
│                 → global request middleware                          [2a]  │
│                 → route-level server middleware, if any              [2b]  │
│                 → API route handler, if matched route defines one (none)   │
│                 → getRouter() creates fresh Router + fresh QueryClient [3]  │
│                 → route matching (params/search)              [section 4]  │
│                 → beforeLoad                    [section 5, serial p→c]    │
│                 → loader → queryClient.ensureQueryData(...)                 │
│                      → createServerFn handler (direct call, not HTTP)       │
│                           → backendRequest() → Spring backend  [section 6] │
│                      ← reshaped, UI-ready data cached in QueryClient        │
│                 → component renders → HTML string, no DOM yet  [section 7] │
│                 → shellComponent streams HTML, dehydrates router state +   │
│                   QueryClient cache                            [section 8] │
└────────────────────────────────────────────────────────────────────────────┘
════════════════════ HTML + dehydrated payload cross the wire ════════════════
┌─ BROWSER ─────────────────────────────────────────────────────────────────┐
│ Client calls getRouter() once → its OWN separate QueryClient, seeded from  │
│ the payload above, not the same object as the server's           [section 9] │
│   → same match state + cache restored, no re-fetch      [section 9, initial] │
│   → React hydrates: attaches to existing DOM, runs effects for the first   │
│     time, does not re-render from scratch                       [section 9] │
│   → beforeLoad/loader (same source as sections 5–6) only re-run on         │
│     navigation or stale refetch                       [section 9, subsequent]│
│        → createServerFn call is now a real fetch() to SERVER_FN_BASE  [10] │
│        → (this briefly re-enters the server process for just that one RPC, │
│          same middleware → handler → backendRequest → Spring path as above)│
└─────────────────────────────────────────────────────────────────────────────┘
```

The dispatch and middleware mechanics (sections 0–2) and the render lifecycle
(sections 3–9) are pure TanStack Start behavior and would be identical in any app
built on it. The BFF (section 6's `createServerFn` handlers and `backendRequest`) is
*our* application logic slotted into one specific point — inside `loader`, on the
server side of the RPC boundary — where TanStack Start already hands us a clean place
to reach out to another service without exposing that service to the browser.
