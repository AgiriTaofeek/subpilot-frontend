# Auth Model

## Trust Boundaries

There are three distinct auth surfaces in SubPilot. Each has its own credential type, scope, and storage strategy.

---

## Surface 1 — Merchant Dashboard (Backend-Owned HttpOnly Cookies)

**Who:** A merchant employee using the browser console.

**How it works:**

1. The browser submits login/signup to TanStack Start.
2. TanStack Start forwards the request to the backend auth endpoint.
3. The backend validates credentials and returns secure `Set-Cookie` headers for merchant web auth, plus safe merchant metadata.
4. TanStack Start passes those cookies back to the browser.
5. On later dashboard requests, the browser sends those cookies to TanStack Start automatically.
6. TanStack Start forwards the cookies to the backend for `me` and other protected merchant endpoints.

**Route guard:**
Dashboard route protection should be based on server-side session awareness through TanStack Start, not a browser-managed JWT in Zustand. The app shell should use backend-authenticated state via `GET /v1/auth/me` or equivalent cookie-authenticated bootstrap.

**Session lifecycle:**
The backend owns the merchant web session contract.

That means the backend should:

- set the auth cookies on login/signup
- refresh them through `POST /v1/auth/refresh`
- clear/revoke them on `POST /v1/auth/logout`
- expose `GET /v1/auth/me` for app boot

The frontend should not treat raw JWTs in JavaScript as the main dashboard auth model.

**Storage:**

- Browser stores backend-issued `HttpOnly` cookies automatically.
- Browser JavaScript should not read the auth cookies.
- Frontend client state may store safe merchant display data, but not raw bearer credentials as the primary auth source.

---

## Surface 2 — Customer Self-Service Portal (Subscription Token)

**Who:** A subscriber accessing their own subscription.

**How it works:**

1. The Subscription Token is an opaque UUID embedded in the portal URL: `/portal/:token`.
2. The frontend extracts it from the route param and passes it to every portal API call.
3. No merchant auth cookie is used for portal access.
4. The backend's portal routes validate the token against the subscription record.

**Scope:**
The subscription token grants access to exactly one subscription. It has no merchant-level permissions. A subscriber cannot:

- access any other subscription, even their own if they have multiple
- read merchant configuration beyond what the portal exposes
- access any dashboard endpoint

**No login required:**
The portal has no login page. The subscription token is the complete authentication. It is not rotated in V1 unless the backend later adds that capability.

**Implementation:**
Portal routes are in `src/routes/portal/$token/`. They have no merchant auth guard. The token is available as a route param and passed directly to portal backend calls.

**Isolation:**
Portal pages should use portal-specific backend functions only. The portal layout has no dashboard sidebar, no merchant account chrome, and no route that bridges the portal and dashboard.

---

## Surface 3 — Programmatic API Key (not via the UI)

**Who:** Backend-to-backend integrations, for example a merchant's server calling SubPilot APIs directly.

**How it works:**
API keys are created in the dashboard (`/settings/api-keys`). The raw key is shown once at creation and never retrievable again. The key is passed in `Authorization: Bearer <key>` on server-to-server calls.

**Frontend role:**
The frontend only manages the lifecycle of API keys, create, list by prefix/label, and revoke. It does not use API keys itself.

This matters because the backend should support both:

- cookie auth for merchant web flows
- bearer auth for programmatic flows

---

## What the Frontend Does NOT Do

- Store merchant JWT auth in `localStorage` or `sessionStorage` as the main web auth model.
- Read raw auth cookies from JavaScript.
- Implement MFA in V1.
- Rotate the subscription token in V1 unless the backend later adds that endpoint.
- Issue or manage API keys programmatically, that remains the backend's responsibility.
- Differentiate user roles within a merchant beyond what the backend exposes in V1.

---

## Security Notes

- Merchant dashboard auth should use backend-issued `HttpOnly` cookies, so XSS risk is reduced compared with JWT-in-JS, but not eliminated. The frontend still has to be strict about dependency hygiene and content rendering.
- Because the merchant web app becomes cookie-authenticated, CSRF protection is required for state-changing merchant routes.
- The portal token in the URL is visible in browser history, logs, and referrer contexts. Treat portal links as shareable-but-secret unless rotation is later added.
- API keys remain high-value secrets and should never appear in browser storage or frontend logs.
