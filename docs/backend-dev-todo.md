# For the backend developer

Two items that need a change on your side — one confirmed bug, one missing
endpoint. Everything else found during this audit was either already fine
or has been wired up on the frontend side.

## Fix: Portal endpoints all return 500

**File:** `src/main/java/co/subpilot/portal/controller/PortalController.java`

**Symptom:** every request to any `/v1/portal/{subscriptionToken}/**` route
returns `500 internal_error`, even with a valid, freshly-issued subscription
token. Confirmed live on all six routes.

**Root cause:** the class-level mapping declares the path variable as
`subscriptionToken`:

```java
@RequestMapping("/v1/portal/{subscriptionToken}")
public class PortalController {
```

but every method binds it with a differently-named, unqualified
`@PathVariable`:

```java
@GetMapping
public ResponseEntity<PortalDtos.PortalSubscriptionView> getSubscription(@PathVariable String token) { ... }
```

`token` doesn't match `subscriptionToken`, and there's no explicit
`@PathVariable("subscriptionToken")` to bridge the mismatch, so Spring MVC
can't resolve the argument and throws before the method body runs — on
every single method in the class (`getSubscription`, `getInvoices`,
`cancel`, `updateCard`, `getAvailablePlans`, `changePlan`).

**Fix:** rename the parameter in all six methods, e.g.:

```java
@GetMapping
public ResponseEntity<PortalDtos.PortalSubscriptionView> getSubscription(
        @PathVariable String subscriptionToken) { ... }
```

(or keep the parameter named `token` and add the explicit
`@PathVariable("subscriptionToken") String token` instead — either works,
just pick one and apply it to all six methods consistently.)

**No frontend changes needed once this lands** — the portal routes
(`src/routes/portal.$token/*`) are currently on mock data specifically
because of this bug, and are ready to be wired to the real endpoints the
moment they work.

## Feature request: public endpoint to check subscription status after checkout

**Where the gap shows up:** `SubscriptionService.java:91` redirects the
customer's browser to
`{frontendBaseUrl}/plans/{merchantSlug}/{planSlug}/success?ref={subscriptionId}`
after Nomba checkout completes. That frontend route now exists
(`src/routes/plans.$merchantSlug.$planSlug.success.tsx`) and shows a static
"payment received, confirming your subscription" message — but it can't
actually check whether the subscription is ready yet, because
`GET /v1/subscriptions/{subscriptionId}` requires an authenticated merchant
session (per `SecurityConfig.java`, only `/v1/public/**`, `/v1/portal/**`,
and a few auth/webhook routes are `permitAll`). The customer landing on
this page has no session at all — confirmed live: the same request that
returns real data with a merchant session returns `403` with none.

**What would unblock real polling here:** a public, slim status-check
endpoint — something like `GET /v1/public/subscriptions/{subscriptionId}/status`
returning just enough to know whether checkout fully landed (e.g.
`{ status: "active" | "trialing" | "pending" }`), scoped so it can't leak
anything sensitive (no customer PII, no full subscription object). Doesn't
need to be `ref`-specific if `subscriptionId` alone is safe to expose
publicly (it's already an unguessable ULID, same trust level as the
existing `subscriptionToken` portal mechanism).

**Not currently blocking anything** — the success page works and is honest
about what it can't verify — but real customers today just see a static
message with no live confirmation, which is a materially worse experience
than actually knowing when their subscription is ready.

## Everything else from this audit (informational, already handled)

No other action needed from you — noting here so nothing gets re-litigated:

- **Dunning campaigns** (`/v1/dunning/campaigns/*`) — working correctly, now
  wired into the frontend at Settings → Dunning.
- **Analytics** (`/v1/analytics/*`) — working correctly, now wired into the
  frontend at the new Analytics page.
- **Audit logs** (`/v1/audit-logs`) — working correctly, now wired into the
  frontend at Settings → Audit log.
- **Webhook signing secret** — turned out to work fine (the
  `signingSecretHash` field is actually the raw, retrievable secret, not a
  hash — the field name is just misleading). Worth a rename or an actual
  hash at some point, but not blocking anything; the frontend already treats
  it as a real secret. Full detail in `docs/BACKEND-GAPS.md` Gap 5.
- **Payment-attempt / per-subscription dunning history** — genuinely has no
  read endpoint (`PaymentAttempt` and `DunningExecution` entities exist but
  aren't exposed via any controller). Not blocking anything today since the
  frontend UI that would've shown this was removed rather than faked, but
  flagging in case it's wanted later. Full detail in `docs/BACKEND-GAPS.md`
  Gap 4.
