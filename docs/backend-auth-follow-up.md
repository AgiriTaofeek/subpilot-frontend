# Backend Auth Follow-Up

These are backend auth items that still deserve a cleanup pass after the
frontend blocker is removed.

They do not block the Phase B tracer-bullet flow anymore, but they are still
worth fixing before calling the cookie-auth model fully hardened.

## Remaining Follow-Up

### 1. CSRF exemption is broader than intended

`CsrfProtectionFilter` currently exempts every path under `/v1/auth/`.

That is wider than the original intent. `signup`, `login`, `refresh`, and
`logout` can reasonably stay exempt, but authenticated mutations like
`PATCH /v1/auth/change-password` should still require `X-CSRF-Token`.

**Why this matters**

- cookie-authenticated mutations should not silently bypass CSRF checks
- the current broad prefix makes future `/v1/auth/*` write endpoints easy to
  under-protect by accident

### 2. Refresh response still returns the refresh token in JSON

The backend now rotates and sets the refresh token as an `HttpOnly` cookie,
which is the right browser model.

But `POST /v1/auth/refresh` still returns the rotated `refreshToken` in the
response body.

**Why this matters**

- it weakens the "cookie-owned credential" model for browser callers
- it creates a second credential exposure path that the rest of the contract
  is trying to remove

**Preferred end state**

- keep refresh fully cookie-owned for browser usage
- return `204 No Content` or another body shape that does not expose the raw
  refresh token

### 3. `GET /v1/auth/me` returns `500` for a valid session after signup

Live end-to-end verification on `2026-07-01` proved that the frontend signup flow
now completes far enough to:

- create the merchant successfully
- set the `_subpilot_session` cookie in the browser
- redirect the browser to `/overview`

But the next authenticated bootstrap call to `GET /v1/auth/me` fails with:

- `500 internal_error`
- message: `An unexpected error occurred. Please try again.`

That means the cookie-auth handshake is only partially working in production:
the browser gets a session cookie, but the backend cannot consistently resolve
that cookie back into the current merchant session.

**Why this matters**

- it blocks the dashboard from loading after signup
- it makes the live tracer-bullet flow fail immediately after the first redirect
- it prevents the frontend from distinguishing "signed in" from "broken session
  bootstrap"

**Observed evidence**

- public auth pages now render correctly after the frontend `401`/`403`
  handling fix
- browser signup succeeds and lands on `/overview`
- authenticated `curl` to `/v1/auth/me` with the issued `_subpilot_session`
  cookie returns `500`

**Preferred end state**

- `GET /v1/auth/me` returns `200` with the existing `AuthResponse` shape for
  every valid session cookie
- anonymous requests return a consistent unauthenticated status (`401` or `403`,
  but intentionally and documented)
