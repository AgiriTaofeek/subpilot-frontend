# Frontend BFF Architecture

This document captures the recommended **Backend for Frontend (BFF)** architecture for SubPilot's web app.

It exists so this decision does not live only in chat history.

If we adopt this architecture, this document becomes the reference for:

- auth boundary design
- data-fetching strategy
- TanStack Start server function usage
- how the browser should talk to the backend

---

## Decision Summary

**Recommended:** build SubPilot as a **thin BFF on TanStack Start**, with **backend-owned cookie auth** for merchant web flows.

That means:

- the browser talks primarily to the **TanStack Start server**
- the TanStack Start server talks to the **Spring backend**
- the Spring backend remains the **source of truth** for business logic, persistence, billing workflows, and Nomba integration
- the Spring backend also owns **merchant web auth cookies, refresh, logout, and `me`**

This is **not** a second backend.

It is a thin application boundary that:

- forwards auth cookies to Spring
- passes backend `Set-Cookie` headers back to the browser
- shapes backend responses for UI needs
- centralizes page-level orchestration and error handling

---

## Why This Is The Recommendation

SubPilot is not a brochure site with a few forms. It is a billing product with:

- merchant auth
- subscriber checkout
- token-gated portal access
- eventual consistency from webhooks
- sensitive operational actions

If the browser calls the Java backend directly for authenticated flows, the frontend has to own too much:

- auth boot logic
- error normalization
- cross-origin/CORS concerns
- exposure of backend base URLs and auth semantics to the browser
- fragile client-side request policy

TanStack Start already gives us a server boundary. We should use it.

At the same time, we do **not** want TanStack Start to become a mini auth server that stores backend tokens as its own long-term session source of truth.

So the right split is:

- Start owns the **application boundary**
- Spring owns the **merchant web auth lifecycle**

---

## What "Thin BFF" Means

Good BFF:

- reads incoming browser cookies on the server
- forwards cookies to Spring for protected calls
- passes backend `Set-Cookie` headers back to the browser
- returns only the data the UI needs
- maps ugly backend errors into clean UI errors
- consolidates multi-call page data when useful

Bad BFF:

- rewrites billing rules already handled by Spring
- mirrors every backend endpoint 1:1 for no reason
- becomes a second source of auth truth
- adds heavy domain logic that belongs in the backend

The BFF should be thin, boring, and UI-serving.

---

## Recommended Request Model

### Browser to Start

Use TanStack Start server functions for app-internal RPC and page actions:

- login
- logout
- get current merchant/session boot state
- create/publish plan
- fetch subscriptions
- fetch overview data
- start public checkout
- portal self-service actions

### Start to Spring

Use a server-only backend client to call the Java backend.

For merchant web flows:

- Start forwards the browser's auth cookies to Spring
- Start does **not** treat browser JS as the primary bearer-token client
- Start does **not** need to be the long-term owner of backend tokens in this model

---

## Data Flow

```text
Browser
  └─ TanStack Start
       ├─ Route loaders
       ├─ Server functions
       ├─ Middleware
       └─ Server-only backend client
            └─ Spring backend
                 └─ Nomba + database + billing engine
```

This is the recommended shape for dashboard, portal, and most checkout-related frontend flows.

---

## Auth Model Under The BFF

### Recommended shape

1. Merchant submits login/signup form to TanStack Start
2. Start calls Spring auth endpoint
3. Spring validates credentials and returns `Set-Cookie` headers plus safe merchant data
4. Start passes those `Set-Cookie` headers back to the browser
5. Future dashboard requests go to Start, not directly to Spring
6. Start forwards incoming browser cookies to Spring on protected calls

### Why this is better

- the browser does not need raw backend JWT auth in JavaScript
- initial route loads can know the user on the server
- auth expiry and redirect behavior live in one coherent server-side path
- same-origin app behavior is easier to reason about
- the backend team fully owns refresh, logout, revocation, and cookie policy

### Important note

This does mean the backend must support cookie-based merchant web auth, not just bearer auth in the response body.

That is a backend contract decision, not just a frontend implementation detail.

---

## Where TanStack Start Fits

TanStack Start gives us three relevant primitives:

- **server functions** for app-internal same-origin RPC
- **server routes** for raw HTTP endpoints when needed
- **middleware** for auth/context/policy around server-side execution

### Use server functions for

- authenticated dashboard reads and writes
- session-aware route boot
- portal reads and writes
- operations that need server-only env/config
- mutations where the browser should not manage raw backend credentials directly

### Use server routes for

- true public HTTP endpoints
- cases where a stable URL matters more than RPC ergonomics
- future cases like webhook-like or public machine-facing endpoints served by the frontend layer

### Do not misuse server functions

Server functions are for app-internal boundaries, not as your public external API contract.

---

## Official TanStack References

These are the main official references behind this recommendation:

- [TanStack Start, Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [TanStack Start, Server Routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes)
- [TanStack Start, Middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- [TanStack Start, Execution Model](https://tanstack.com/start/latest/docs/framework/react/execution-model)
- [TanStack Start, Authentication Overview](https://tanstack.com/start/latest/docs/framework/react/guide/authentication-overview)
- [TanStack Start, Authentication](https://tanstack.com/start/latest/docs/framework/react/guide/authentication)
- [TanStack Start, Authentication Server Primitives](https://tanstack.com/start/latest/docs/framework/react/guide/authentication-server-primitives)
- [TanStack Start Basic Auth Example](https://tanstack.com/start/latest/docs/framework/react/examples/start-basic-auth)

When implementing this architecture, prefer the docs for the exact pinned TanStack version in `package.json`, not moving `latest` examples.

---

## What Changes In Our Frontend Plan

If we adopt this architecture, these earlier assumptions change:

- Dashboard auth is no longer "browser stores token and Axios attaches bearer token".
- The frontend's main data boundary becomes `browser -> Start server -> backend`.
- `src/lib/api/` should become a **server-side backend client layer** or a BFF-facing abstraction, not a browser-first Axios layer.
- Query functions in routes/components should call server functions or loader-backed functions, not directly hit Spring from the browser.
- Auth bootstrap should be based on backend-owned cookies + `GET /v1/auth/me`.

This is a meaningful architecture choice, not a cosmetic refactor.

---

## Proposed Frontend Structure

```text
src/
  lib/
    backend/
      client.ts
      auth.ts
      plans.ts
      subscriptions.ts
      portal.ts
      public.ts
    server/
      auth/
        cookies.ts
        csrf.ts
        middleware.ts
      functions/
        auth/
        plans/
        subscriptions/
        portal/
        public/
  routes/
    ...
```

### Structure intent

- `src/lib/backend/*`
  - talks to Spring
  - server-only
  - forwards cookies when needed
- `src/lib/server/auth/*`
  - request cookie forwarding, `Set-Cookie` pass-through, CSRF helpers, auth middleware
- `src/lib/server/functions/*`
  - TanStack Start server functions used by the app

This keeps boundaries obvious.

---

## Recommended First Server Functions

Start with the smallest set that proves the architecture:

- `login`
- `signup`
- `logout`
- `getCurrentMerchant`
- `createPlan`
- `publishPlan`
- `getPlanDetail`
- `getSubscriptionsList`
- `getPublicPlan`
- `startCheckout`

If these work cleanly, the BFF model is validated.

---

## Security Notes

If we use a BFF with backend-owned cookies, we should do it properly.

Minimum requirements:

- cookie forwarding that preserves the backend auth contract
- safe pass-through of backend `Set-Cookie` headers
- CSRF protection for cookie-authenticated merchant mutations
- server-only backend client code
- no leaking raw backend auth state into browser JavaScript unless explicitly intended

Do not build a half-BFF where some routes use backend-owned cookie auth and other dashboard routes still expose raw backend JWT auth to the browser. That creates a split trust model and will get messy fast.

---

## Performance Notes

The main performance risk with a BFF is accidental over-chattiness:

- browser asks Start
- Start asks Spring
- Start asks Spring again
- Start asks Spring again

That is fixable if the BFF is disciplined.

Rules:

- compose page data server-side when it meaningfully reduces request waterfalls
- avoid needless proxy layers
- keep the BFF thin and boring
- do not add caching before there is a real bottleneck

This is still simpler than pushing all auth and orchestration complexity into the browser.

---

## What Not To Do

- Do not rebuild backend billing logic in TanStack Start
- Do not proxy every endpoint 1:1 unless the UI truly benefits
- Do not keep two different auth strategies alive for the same dashboard surface
- Do not let browser code become the main source of merchant dashboard auth truth
- Do not make TanStack Start the long-term owner of backend auth tokens if the backend already owns cookie auth

---

## Migration Note

Some current docs were written against earlier auth assumptions.

The active recommended direction now is:

- thin TanStack Start BFF
- backend-owned merchant auth cookies
- backend-owned refresh/logout/`me`

This document is the reference for that direction.

---

## Recommendation

For SubPilot, the recommended frontend architecture is:

```text
Browser -> TanStack Start server functions/routes -> Spring backend
```

Use a **thin BFF**.

Keep Spring as the real backend.

Let TanStack Start own the web application boundary, and let Spring own merchant web authentication.
