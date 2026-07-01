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
