# Backend Phase B Handoff

This document is for the backend engineer.

It explains exactly what the frontend needs from the backend to implement the real Phase B tracer-bullet loop in `docs/going-live.md`.

This is based on:

- the live Swagger at `https://nomba-subpilot.duckdns.org/api/swagger-ui/index.html#/`
- the read-only backend code in `sub-pilot/`

The goal is not to redesign the backend.

The goal is to make the existing backend contract usable for the frontend with the fewest necessary changes.

---

## Executive Summary

The good news:

- plans endpoints already exist
- public hosted checkout endpoints already exist
- subscriptions list/detail endpoints already exist
- merchant auth is already partly cookie-based

So the main backend blocker for frontend Phase B is **not plans or checkout**.

It is **merchant session lifecycle**.

Today the backend already:

- sets `_subpilot_session` as an `HttpOnly` cookie on signup/login
- reads that cookie in the auth filter
- has a refresh-token concept internally

But the current contract still has four practical gaps:

1. there is no `GET /v1/auth/me` session-bootstrap endpoint
2. signup/login generate a refresh token, but do not give the frontend a usable way to keep it
3. logout only revokes the stored refresh token if the access cookie is still valid
4. CSRF is disabled while merchant auth is cookie-based

Those gaps are why the frontend can log in once, but still cannot build a durable merchant session flow with confidence.

---

## What Already Exists

These backend surfaces already look usable for the frontend:

### Auth

- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`

Relevant backend files:

- `sub-pilot/src/main/java/co/subpilot/auth/controller/AuthController.java`
- `sub-pilot/src/main/java/co/subpilot/auth/service/AuthService.java`
- `sub-pilot/src/main/java/co/subpilot/auth/security/AuthFilter.java`
- `sub-pilot/src/main/java/co/subpilot/auth/security/SessionCookie.java`

### Plans

- `GET /v1/plans`
- `POST /v1/plans`
- `GET /v1/plans/{id}`
- `PATCH /v1/plans/{id}`
- `POST /v1/plans/{id}/publish`

Relevant backend file:

- `sub-pilot/src/main/java/co/subpilot/plan/controller/PlanController.java`

### Public checkout

- `GET /v1/public/plans/{merchantSlug}/{planSlug}`
- `POST /v1/public/plans/{merchantSlug}/{planSlug}/checkout`

Relevant backend file:

- `sub-pilot/src/main/java/co/subpilot/subscription/controller/SubscriptionController.java`

### Subscriptions

- `GET /v1/subscriptions`
- `GET /v1/subscriptions/{subscriptionId}`

Relevant backend file:

- `sub-pilot/src/main/java/co/subpilot/subscription/controller/SubscriptionController.java`

So this handoff doc is mostly about **finishing the auth contract**, not creating the whole backend from scratch.

---

## Current Auth Problem

### 1. Signup/login set the access cookie, which is good

Current code:

```java
@PostMapping("/auth/login")
public ResponseEntity<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest req) {
    AuthService.AuthResult result = authService.login(req);
    return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, sessionCookie(result.accessToken()).toString())
            .body(result.body());
}
```

This is from `AuthController`.

That means the backend already supports browser-friendly `HttpOnly` access-cookie auth for merchant routes.

Good.

### 2. A refresh token exists internally, but the frontend cannot actually use it

Current code:

```java
String token = jwtService.generateToken(user.getId(), merchant.getId(), user.getEmail());
String refreshToken = issueRefreshToken(user);

return new AuthResult(
        new AuthDtos.AuthResponse(merchant.getId(), user.getId(), user.getEmail(), merchant.getBusinessName()),
        token, refreshToken
);
```

This is from `AuthService`.

But `AuthController` only sends the access cookie plus `result.body()`.

It does **not** return the refresh token on signup/login.

So the backend is generating a refresh token and then effectively dropping it on the floor from the frontend's point of view.

### 3. There is no `GET /v1/auth/me`

The frontend needs one canonical endpoint to answer:

> "The browser has a cookie. Who is signed in right now?"

That endpoint does not exist in Swagger and does not exist in `AuthController`.

Without it, the frontend cannot cleanly bootstrap the merchant shell on page load or route guard the dashboard server-side.

### 4. Logout revocation depends on a still-valid access session

Current code:

```java
@PostMapping("/auth/logout")
public ResponseEntity<Map<String, String>> logout() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getName() != null) {
        authService.logout(auth.getName());
    }

    ResponseCookie expired = ResponseCookie.from(SessionCookie.NAME, "")
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/")
            .maxAge(0)
            .build();

    return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, expired.toString())
            .body(Map.of("message", "Logged out."));
}
```

This means:

- if the access cookie is still valid, logout clears the stored refresh token
- if the access cookie is already expired, logout clears only the access cookie in the browser response
- the stored refresh token may remain revivable server-side

That is not a complete logout model.

### 5. CSRF is disabled

Current code:

```java
http
    .cors(cors -> cors.configurationSource(corsConfigurationSource))
    .csrf(AbstractHttpConfigurer::disable)
```

This is from `SecurityConfig`.

For a hackathon demo, this is not the first blocker.

But once merchant auth is cookie-based, this needs a real answer before calling the auth model finished.

---

## What The Frontend Needs Changed

## 1. Add `GET /v1/auth/me`

This is the most important missing endpoint.

### Why

The frontend needs a server-safe session bootstrap endpoint for:

- dashboard route guards
- SSR-aware merchant shell boot
- refresh-after-reload behavior
- "am I signed in?" checks without guessing

### Expected behavior

- Read `_subpilot_session` from the request cookie.
- Authenticate the merchant exactly the same way protected routes already do.
- Return the current merchant/user identity.
- Return `401` if there is no valid merchant session.

### Recommended response shape

The simplest move is to reuse the existing safe auth body:

```json
{
  "merchantId": "merchant_123",
  "userId": "user_123",
  "email": "merchant@example.com",
  "businessName": "Acme Inc"
}
```

### Example controller shape

```java
@GetMapping("/auth/me")
public ResponseEntity<AuthDtos.AuthResponse> me() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    String userId = auth != null ? auth.getName() : null;

    if (userId == null) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    return ResponseEntity.ok(authService.getCurrentUser(userId));
}
```

### Example service shape

```java
public AuthDtos.AuthResponse getCurrentUser(String userId) {
    User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

    Merchant merchant = merchantRepository.findById(user.getMerchantId())
            .orElseThrow(() -> new ResourceNotFoundException("Merchant", user.getMerchantId()));

    return new AuthDtos.AuthResponse(
            merchant.getId(),
            user.getId(),
            user.getEmail(),
            merchant.getBusinessName()
    );
}
```

## 2. Make refresh usable immediately after signup/login

Right now there is a refresh flow in theory but not in practice.

The backend has two valid ways to fix this.

### Preferred fix: use an HttpOnly refresh cookie

This is the cleanest model for the web app.

That means:

- signup sets access cookie and refresh cookie
- login sets access cookie and refresh cookie
- refresh reads refresh cookie
- logout clears both cookies and revokes the stored refresh token

### Recommended cookie pair

- access cookie: `_subpilot_session`
- refresh cookie: `_subpilot_refresh`

### Example cookie helper

```java
private ResponseCookie refreshCookie(String refreshToken) {
    return ResponseCookie.from("_subpilot_refresh", refreshToken)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/")
            .maxAge(Duration.ofMillis(refreshExpirationMs))
            .build();
}
```

### Example login/signup response

```java
return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, sessionCookie(result.accessToken()).toString())
        .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken()).toString())
        .body(result.body());
```

### Example refresh endpoint with cookie-based refresh

```java
@PostMapping("/auth/refresh")
public ResponseEntity<Void> refresh(
        @CookieValue(name = "_subpilot_refresh", required = false) String refreshToken
) {
    if (refreshToken == null || refreshToken.isBlank()) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    AuthService.AuthResult result = authService.refresh(new AuthDtos.RefreshRequest(refreshToken));

    return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, sessionCookie(result.accessToken()).toString())
            .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken()).toString())
            .build();
}
```

### Faster fallback if cookie refresh is not being done yet

If the backend does not want to add a refresh cookie immediately, then signup/login must at least return the refresh token in the JSON body.

That would let the frontend store it temporarily and call the existing body-based refresh endpoint.

That fallback is usable for a hackathon.

It is not the preferred long-term model.

### Example fallback response DTO

```java
public record LoginSuccessResponse(
        String merchantId,
        String userId,
        String email,
        String businessName,
        String refreshToken
) {}
```

The frontend would prefer not to use this fallback unless necessary.

## 3. Make logout revoke the refresh token even if the access cookie is expired

The logout endpoint should revoke the durable session credential, not only the currently-valid access token.

### Why

Right now logout depends on `SecurityContextHolder.getContext().getAuthentication()`.

That means logout only revokes the refresh token when the access token is still alive.

If the access token expired first, logout may clear the access cookie in the response but leave the refresh token chain alive.

### Preferred behavior

- identify the session to revoke from the refresh cookie
- revoke that stored refresh token hash
- clear both access and refresh cookies
- succeed even if the short-lived access cookie is already expired

### Example logout shape

```java
@PostMapping("/auth/logout")
public ResponseEntity<Map<String, String>> logout(
        @CookieValue(name = "_subpilot_refresh", required = false) String refreshToken
) {
    if (refreshToken != null && !refreshToken.isBlank()) {
        authService.logoutByRefreshToken(refreshToken);
    }

    ResponseCookie expiredAccess = ResponseCookie.from(SessionCookie.NAME, "")
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/")
            .maxAge(0)
            .build();

    ResponseCookie expiredRefresh = ResponseCookie.from("_subpilot_refresh", "")
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/")
            .maxAge(0)
            .build();

    return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, expiredAccess.toString())
            .header(HttpHeaders.SET_COOKIE, expiredRefresh.toString())
            .body(Map.of("message", "Logged out."));
}
```

### Example service method

```java
@Transactional
public void logoutByRefreshToken(String rawRefreshToken) {
    String hash = sha256(rawRefreshToken);
    userRepository.findByRefreshTokenHash(hash).ifPresent(user -> {
        user.setRefreshTokenHash(null);
        user.setRefreshTokenExpiresAt(null);
        userRepository.save(user);
    });
}
```

## 4. Add a real CSRF story for cookie-authenticated merchant mutations

This is not the first blocker for local Phase B wiring, but it is part of finishing the auth contract properly.

Once merchant auth is cookie-based, POST/PATCH/DELETE merchant routes should not stay permanently on `csrf(AbstractHttpConfigurer::disable)`.

The backend can choose the Spring-friendly approach it prefers:

- synchronizer token
- double-submit cookie
- another clear CSRF defense

The important point is simple:

- cookie-authenticated merchant mutations need CSRF protection before this auth model is treated as production-ready

---

## What The Frontend Will Use Once This Lands

If the backend makes the changes above, the frontend Phase B auth flow becomes straightforward:

### Signup

```text
Browser -> TanStack Start -> POST /v1/auth/signup
Backend -> Set-Cookie access + Set-Cookie refresh + merchant payload
Frontend -> redirect to /overview
```

### Login

```text
Browser -> TanStack Start -> POST /v1/auth/login
Backend -> Set-Cookie access + Set-Cookie refresh + merchant payload
Frontend -> redirect to /overview
```

### Session bootstrap

```text
Browser reloads page
TanStack Start calls GET /v1/auth/me with forwarded cookies
Backend returns merchant identity or 401
Frontend either renders dashboard or redirects to /auth/login
```

### Refresh

```text
Protected call fails because access cookie expired
TanStack Start calls POST /v1/auth/refresh
Backend validates refresh credential
Backend returns fresh cookies
TanStack Start retries the original request
```

### Logout

```text
Browser -> TanStack Start -> POST /v1/auth/logout
Backend revokes refresh credential and clears both cookies
Frontend redirects to /auth/login
```

---

## What Does Not Need Backend Work Right Now

For the first real tracer bullet, these routes already exist and do not appear blocked from a contract perspective:

- `GET /v1/plans`
- `POST /v1/plans`
- `POST /v1/plans/{id}/publish`
- `GET /v1/public/plans/{merchantSlug}/{planSlug}`
- `POST /v1/public/plans/{merchantSlug}/{planSlug}/checkout`
- `GET /v1/subscriptions`

So the backend work to unblock the frontend is mostly:

1. finish merchant session lifecycle
2. not rebuild the entire API

---

## Backend Change Checklist

- Add `GET /v1/auth/me`
- Return a usable refresh credential from signup/login
- Prefer setting refresh as an `HttpOnly` cookie
- Make `POST /v1/auth/refresh` work from that refresh credential
- Make `POST /v1/auth/logout` revoke refresh state even when access auth is expired
- Clear both access and refresh cookies on logout
- Add CSRF protection for cookie-authenticated merchant mutations

---

## Recommended Order

Fastest implementation order:

1. add `GET /v1/auth/me`
2. make refresh usable from first login/signup
3. fix logout revocation semantics
4. add CSRF protection

That order gets the frontend moving as soon as possible while still steering toward the correct auth model.
