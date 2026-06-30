# Backend Auth Architecture Request

This document is written for the SubPilot backend engineer.

Its purpose is to make one decision unambiguous:

> What auth/session model should power the SubPilot web app when the browser talks to TanStack Start, and TanStack Start talks to the Spring backend?

This replaces the earlier idea that TanStack Start should store backend access and refresh tokens in its own server-managed session.

The recommended model now is different:

- the **backend owns web auth**
- the **backend issues and clears the auth cookies**
- **TanStack Start remains the browser-facing app server/BFF**
- TanStack Start **forwards cookies to the backend and passes backend `Set-Cookie` headers back to the browser**

---

## Executive Summary

The target architecture is:

```text
Browser -> TanStack Start -> Spring backend
```

### What this means

- The browser talks only to the TanStack Start app for normal web navigation and mutations.
- TanStack Start remains the same-origin application boundary for SSR, routing, server functions, and UI-oriented orchestration.
- The Spring backend owns authentication, refresh, logout, cookie issuance, revocation, and merchant identity.
- The browser should not store raw backend JWTs in JavaScript-managed state.
- TanStack Start should not become a parallel auth server that stores backend tokens as its own source of truth.

### In plain English

The browser logs into the backend through TanStack Start.

The backend sets secure auth cookies.

The browser sends those cookies to TanStack Start.

TanStack Start forwards them to the backend when it needs protected data.

That is the whole model.

---

## Why We Want This Model

SubPilot is a web product with:

- merchant dashboard auth
- public checkout
- token-gated portal access
- sensitive operational actions
- SSR/server-aware app boot through TanStack Start
- a separate programmatic API-key surface for downstream systems

Given that shape, we want one place to own web authentication.

That place should be the backend.

Why:

- It keeps auth ownership in one system instead of splitting it across Start and Spring.
- It avoids introducing a frontend-side session database or encrypted-token session scheme just to manage backend credentials.
- It gives the backend team clear responsibility for login, refresh, logout, revocation, cookie policy, and session security.
- It still preserves the frontend advantages of TanStack Start, same-origin routing, SSR, server functions, and UI-specific response shaping.

---

## Recommended Responsibilities

### Browser

- stores backend-issued auth cookies automatically
- cannot read those cookies from JavaScript because they are `HttpOnly`
- calls TanStack Start routes/server functions only
- never stores raw backend access/refresh tokens in Zustand, `localStorage`, or `sessionStorage`

### TanStack Start

- remains the browser-facing web server and BFF
- renders pages, handles routing, and runs server functions
- forwards browser cookies to the backend on protected requests
- passes backend `Set-Cookie` headers back to the browser
- uses backend auth endpoints such as `login`, `refresh`, `logout`, and `me`
- does not become the long-term owner of backend tokens

### Spring Backend

- verifies credentials
- issues access and refresh auth cookies
- authenticates merchant web requests from cookies
- refreshes auth cookies
- clears/revokes auth cookies on logout
- returns current authenticated merchant/session info
- remains the source of truth for merchant identity and authorization

---

## Current Backend State

Today the backend behaves like a stateless bearer-token API:

- login/signup return a JWT in the response body
- protected routes expect `Authorization: Bearer <token>`
- Spring session state is disabled
- there is no proper logout/revoke endpoint
- there is no refresh endpoint
- current JWT TTL is 24 hours

That is fine as current state.

It is not the target contract for the web frontend.

For the web app, we now want backend-owned cookie auth.

---

## Target Backend Contract

The backend should support this lifecycle:

```text
Login / Signup
  -> validate credentials or create merchant
  -> set short-lived access cookie
  -> set longer-lived refresh cookie
  -> return safe merchant payload

Authenticated request
  -> browser sends cookies to Start
  -> Start forwards cookies to backend
  -> backend authenticates from cookie

Access cookie expires
  -> Start calls refresh endpoint with refresh cookie
  -> backend validates refresh cookie
  -> backend sets fresh auth cookies
  -> Start retries the original request

Logout
  -> Start calls logout endpoint with cookies
  -> backend revokes refresh/session state
  -> backend clears auth cookies
  -> Start passes cookie-clearing response to browser
```

---

## Web Auth Contract We Want

### 1. Cookie-based auth for merchant web flows

Merchant dashboard auth should be cookie-based for browser usage.

That means:

- login/signup should set auth cookies with `Set-Cookie`
- protected merchant endpoints should accept cookie-authenticated requests
- the browser should not need to manually attach `Authorization: Bearer <token>` for dashboard usage

### 2. Keep bearer auth for programmatic/API-key flows

This is important.

We do **not** want cookie auth to replace all auth styles.

The backend should support two auth modes:

- **web app / merchant browser flows**: cookie auth
- **programmatic API / API key flows**: `Authorization: Bearer ...`

That means the auth layer/filter must support both:

- web merchant cookie auth
- programmatic bearer auth

This is normal and clean.

---

## What The Backend Should Provide

### 1. Login and signup should set cookies

**Recommended endpoints:**

```text
POST /v1/auth/login
POST /v1/auth/signup
```

**Behavior:**

- validate credentials or create merchant/user
- set access cookie
- set refresh cookie
- return safe merchant payload in the response body

**Recommended response body shape:**

```json
{
  "merchantId": "m_123",
  "userId": "u_123",
  "email": "merchant@example.com",
  "businessName": "Acme Inc",
  "role": "owner"
}
```

The auth cookies should travel in headers, not in this JSON payload.

### 2. Short-lived access cookie

**Recommendation:**

- access token TTL: **10 to 15 minutes**

**Why:**

- reduces blast radius if a token leaks
- works well with refresh-cookie flow
- keeps normal merchant sessions secure without forcing constant re-login

### 3. Refresh endpoint

Add an explicit refresh flow.

**Recommended endpoint:**

```text
POST /v1/auth/refresh
```

**Behavior:**

- reads refresh cookie
- validates that refresh credential/session
- issues fresh access cookie
- ideally rotates refresh cookie too
- returns either `204` or a small success payload

**Why explicit refresh is preferred:**

- easier to reason about than silent magic refresh
- Start can handle expiry and retry logic predictably
- easier to observe, test, and debug

### 4. Logout / revoke endpoint

Add a real logout endpoint.

**Recommended endpoint:**

```text
POST /v1/auth/logout
```

**Behavior:**

- revoke refresh token or session family
- clear access cookie
- clear refresh cookie
- prevent future refresh from that session

Without this, logout is not really logout.

### 5. Current user / current session endpoint

Add an identity endpoint.

**Recommended endpoint:**

```text
GET /v1/auth/me
```

**Behavior:**

- authenticate from cookie
- return current merchant/user identity
- return 401 if no valid web session exists

**Recommended response body:**

```json
{
  "merchantId": "m_123",
  "userId": "u_123",
  "email": "merchant@example.com",
  "businessName": "Acme Inc",
  "role": "owner"
}
```

This is the payload TanStack Start should use to bootstrap the merchant shell.

### 6. Refresh token persistence and revocation

Refresh cookies should not be stateless throwaway values with no server record.

**Recommended storage model:**

Store refresh/session credentials hashed in the database with fields like:

- `id`
- `merchantId`
- `userId`
- `tokenHash`
- `issuedAt`
- `expiresAt`
- `revokedAt`
- `replacedByTokenId` or token-family metadata
- `userAgent` and `ipAddress` if desired for audit/security visibility

**Why:**

- allows logout/revocation
- allows rotation
- limits replay risk
- makes session management explicit

---

## Cookie Expectations

For the merchant web app, the backend should own the cookies.

### Access cookie

Recommended properties:

- `HttpOnly`
- `Secure` in production
- `SameSite=Lax` unless stricter works for all flows
- short-lived
- scoped to the app/backend domain strategy you choose

### Refresh cookie

Recommended properties:

- `HttpOnly`
- `Secure` in production
- `SameSite=Lax` unless stricter works for all flows
- longer-lived than the access cookie
- rotated on refresh if possible

### Naming

Names are not important, but a clear pair is helpful, for example:

- `sp_access`
- `sp_refresh`

The exact names are less important than consistent semantics.

---

## CSRF Requirement

Once merchant web auth becomes cookie-based, CSRF protection becomes mandatory for state-changing routes.

Please include a CSRF strategy for authenticated mutations.

Acceptable directions include:

- synchronizer token pattern
- double-submit cookie pattern
- another solid framework-appropriate CSRF defense

The main requirement is simple:

- cookie-authenticated POST/PUT/PATCH/DELETE merchant routes must not be vulnerable to CSRF

This is a first-class requirement, not a nice-to-have.

---

## What The Frontend Will Do

If the backend exposes the contract above, the frontend will implement this model.

### Login flow

```text
1. Browser submits email/password to TanStack Start
2. TanStack Start forwards credentials to POST /v1/auth/login
3. Backend validates credentials
4. Backend returns:
   - Set-Cookie: access cookie
   - Set-Cookie: refresh cookie
   - safe merchant payload
5. TanStack Start passes Set-Cookie headers back to browser
6. Browser stores cookies automatically
7. Frontend redirects merchant into dashboard
```

### Signup flow

```text
1. Browser submits businessName/email/password to TanStack Start
2. TanStack Start forwards request to POST /v1/auth/signup
3. Backend creates merchant and user
4. Backend returns:
   - Set-Cookie: access cookie
   - Set-Cookie: refresh cookie
   - safe merchant payload
5. TanStack Start passes Set-Cookie headers back to browser
6. Browser stores cookies automatically
7. Frontend redirects merchant into dashboard
```

### Authenticated request flow

```text
1. Browser requests a protected page/action from TanStack Start
2. Browser automatically sends auth cookies to Start
3. TanStack Start forwards those cookies to backend /v1/auth/me or another protected endpoint
4. Backend authenticates the request from cookies
5. Backend returns data
6. TanStack Start renders the page or returns the payload
```

### Refresh flow

```text
1. TanStack Start calls a protected backend endpoint with current cookies
2. Backend indicates access auth is expired
3. TanStack Start calls POST /v1/auth/refresh, forwarding the refresh cookie
4. Backend validates refresh state
5. Backend responds with fresh Set-Cookie auth headers
6. TanStack Start passes Set-Cookie back to browser
7. TanStack Start retries the original backend request
8. Browser continues as if nothing happened
```

### Logout flow

```text
1. Merchant clicks logout in browser
2. Browser calls TanStack Start logout action
3. TanStack Start forwards request and cookies to POST /v1/auth/logout
4. Backend revokes refresh/session state
5. Backend responds with Set-Cookie headers that clear auth cookies
6. TanStack Start passes those headers back to browser
7. Browser deletes cookies
8. Merchant is redirected to /auth/login or /
```

---

## Who Stores What

This is the part that must stay crystal clear.

### Browser stores

- backend-issued auth cookies
- nothing else auth-critical in JavaScript-managed state

### TanStack Start stores

- no long-term backend access token or refresh token as its own source of truth
- only request-scoped awareness of incoming cookies and outgoing `Set-Cookie` headers
- optional non-sensitive UI boot state derived from `/v1/auth/me`

### Spring backend stores

- whatever session/refresh persistence is needed to validate, rotate, and revoke web auth

So yes, the browser holds cookies.

But no, the browser should not be the place where raw JWTs live in JS state.

And no, Start should not be the main long-term token store in this model.

---

## What We Are Explicitly Asking The Backend To Change

We are asking the backend to:

1. support cookie-based merchant web auth
2. set auth cookies on login/signup
3. add a refresh endpoint for cookie-authenticated session renewal
4. add a logout endpoint that revokes and clears auth state
5. add a `me` endpoint for authenticated merchant identity bootstrap
6. keep API-key / programmatic bearer auth intact
7. add CSRF protection for cookie-authenticated merchant mutations
8. shorten access-token lifetime substantially
9. store refresh/session credentials in a revocable, rotatable way

---

## What We Are Explicitly Not Asking The Backend To Do

We are **not** asking the backend to:

- move UI rendering into Spring
- take over the TanStack Start routing layer
- remove bearer auth for machine/API-key flows
- push raw JWTs back into browser JavaScript as the main merchant auth model
- move business logic into the frontend server

TanStack Start remains the app server/BFF.

The backend becomes the clear owner of web authentication.

---

## Why This Is Better Than The Earlier Start-Owned-Session Idea

The earlier proposal was:

- backend returns tokens to Start
- Start stores those tokens in its own server-managed session
- browser only holds a frontend session cookie

That model can work.

It is not the model we want now.

Why we prefer backend-owned cookies instead:

- fewer moving parts in the frontend auth layer
- cleaner team boundary
- clearer ownership of refresh/logout/session security
- no separate frontend session-store decision required
- less chance of accidentally building a mini auth server inside Start

This is the more comfortable and more organizationally coherent choice for this project.

---

## Recommended API Shapes

These are suggested semantics, not rigid names.

### Login

```text
POST /v1/auth/login
```

```json
{
  "email": "merchant@example.com",
  "password": "secret"
}
```

Response:

- `Set-Cookie` for access auth
- `Set-Cookie` for refresh auth
- body:

```json
{
  "merchantId": "m_123",
  "userId": "u_123",
  "email": "merchant@example.com",
  "businessName": "Acme Inc",
  "role": "owner"
}
```

### Signup

```text
POST /v1/auth/signup
```

```json
{
  "businessName": "Acme Inc",
  "email": "merchant@example.com",
  "password": "secret"
}
```

Response:

- `Set-Cookie` for access auth
- `Set-Cookie` for refresh auth
- body:

```json
{
  "merchantId": "m_123",
  "userId": "u_123",
  "email": "merchant@example.com",
  "businessName": "Acme Inc",
  "role": "owner"
}
```

### Refresh

```text
POST /v1/auth/refresh
```

Request body can be empty if refresh credential is fully cookie-based.

Response:

- fresh `Set-Cookie` auth headers
- optional minimal success payload

### Logout

```text
POST /v1/auth/logout
```

Response:

- `Set-Cookie` headers that clear auth cookies
- optional success payload

### Current user

```text
GET /v1/auth/me
```

```json
{
  "merchantId": "m_123",
  "userId": "u_123",
  "email": "merchant@example.com",
  "businessName": "Acme Inc",
  "role": "owner"
}
```

---

## If The Backend Cannot Change Immediately

If we must ship before this backend-owned-cookie model lands, the earlier Start-owned-token-session model can still be used as a fallback for the hackathon.

But that is now the fallback, not the recommendation.

The target architecture we want is:

- backend-owned auth cookies
- backend-owned refresh/logout/revocation
- TanStack Start as the communication layer and BFF

---

## Final Recommendation

For the SubPilot web app, the recommended auth architecture is:

```text
Browser -> TanStack Start -> Spring backend
```

with this ownership split:

- **backend owns auth cookies**
- **backend owns refresh**
- **backend owns logout/revocation**
- **backend owns current-user identity endpoint**
- **TanStack Start forwards cookies and passes through Set-Cookie**
- **browser never stores merchant JWT auth in JavaScript as the main web auth model**

This is the architecture we want the backend contract to support.
