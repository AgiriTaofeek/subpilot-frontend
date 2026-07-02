# The SubPilot Story

This document tells the story of SubPilot end to end — from a visitor
landing on the marketing site to a merchant running their business and a
customer managing their own subscription. It's written as a narrative on
purpose, but every technical claim in it — every route, every endpoint,
every cookie, every field name — is verified against the real, live
backend and the actual frontend code as of 2026-07-02, not from planning
docs or intent. Where something is a known limitation or a deliberate
simplification, it says so.

Two recurring characters carry the story:

- **Aisha** runs **Loomstack**, a small SaaS product. She's the merchant —
  the person who signs up for SubPilot, creates pricing plans, and watches
  her business run.
- **Tunde** is one of Loomstack's customers. He's the subscriber — the
  person who pays Aisha money every month, and who occasionally needs to
  update his card or cancel.

Everything below happened, in this order, exactly as described.

This is a living document, written in batches. Each numbered section below
is a complete, self-contained chapter.

---

## 1. Arrival, signup, and getting into the dashboard

### Aisha finds SubPilot

Aisha lands on SubPilot's marketing homepage (`/`, rendered by
`src/components/layout/marketing-home.tsx` inside the `_marketing` layout).
The headline is direct about what the product is:

> "The managed subscription layer Nomba doesn't ship."
> "Plans, billing cycles, proration, dunning, customer portal, and
> webhooks — operated from a single surface."

This one sentence is a fairly literal table of contents for the rest of
this document — dunning and webhooks and the customer portal are all real,
separate systems you'll meet later. The page is entirely static marketing
content; nothing on it calls the backend. Aisha clicks the "Get started"
button, which is a plain `<Link to="/auth/signup">`.

### The signup form

She lands on `/auth/signup` (`src/routes/auth/signup.tsx`). This route
sits under a pathless layout, `src/routes/auth.tsx`, whose `beforeLoad`
runs first: it calls `getOptionalMerchantSession()` (a `GET /v1/auth/me`
check), and if that *succeeds* — meaning Aisha is already logged in — it
redirects her straight to `/overview` instead of showing the signup form
again. Since she isn't logged in yet, that check comes back empty and the
form renders.

The signup form collects business name, email, password, and phone —
validated client-side with a Zod schema before it ever leaves the browser.
There's a small, honest wrinkle here: the phone field is collected and
kept in the form, but it is **not** sent to the backend. The backend's
signup contract has no phone field yet, and a `TODO(blocked)` comment in
the code says so explicitly rather than silently dropping the field or
faking support for it.

Aisha submits. This calls `signupMerchant({ data: { businessName, email,
password } })`, a TanStack Start server function
(`src/lib/api/auth.ts`), which on the server calls:

```
POST /v1/auth/signup
{ businessName, email, password }
```

### Three cookies, three jobs

The backend creates Aisha's merchant account and responds with her session
info plus three `Set-Cookie` headers. Each cookie has a distinct,
single-purpose job:

| Cookie | Purpose |
|---|---|
| `_subpilot_session` | The actual credential. Sent on every authenticated request; the backend checks this to know who Aisha is. |
| `_subpilot_refresh` | A longer-lived credential used for exactly one thing: minting a fresh `_subpilot_session` when the old one expires, via `POST /v1/auth/refresh`. Never sent on ordinary requests. |
| `_subpilot_csrf` | Not `HttpOnly` — the frontend JavaScript can read it. Its value must be echoed back as an `X-CSRF-Token` header on every mutating request (POST/PATCH/DELETE). This is the classic double-submit CSRF pattern: an attacker's site can trick a browser into *sending* Aisha's cookies, but it can't *read* the CSRF cookie's value to also send the matching header. |

Getting all three of these cookies to actually reach the browser turned
out to be less trivial than it sounds — early in this project, the code
that forwarded `Set-Cookie` headers from the backend response back to the
browser used a header-setting call that *replaces* a header instead of
*appending* to it, so of three cookies set in one response, only the last
one ever survived the round trip. That bug is fixed (`forwardResponseCookies`
in `src/lib/api/backend.ts` now uses `Headers.append()`, which is the
correct primitive for a repeatable header like `Set-Cookie`), but it's a
good example of how much of this "simple" flow is actually load-bearing
plumbing.

### Walking into the dashboard for the first time

On success, the signup page navigates Aisha to `/overview`. This is where
the *other* layout route in this app matters: `src/routes/_dashboard.tsx`
wraps every dashboard page, and its `beforeLoad` runs before any of them —
`/overview`, `/plans`, `/settings/account`, all of it. That `beforeLoad`
calls `getMerchantSession()`, which is another `GET /v1/auth/me`, this
time expected to succeed because Aisha now has a real session cookie. It
returns her merchant identity (id, email, business name) into the route's
context, and the dashboard shell — sidebar, header, and whatever page she
landed on — renders around it.

If that session check *fails* instead — an expired cookie, a genuinely
logged-out visitor typing `/overview` directly — the `beforeLoad` doesn't
just crash. It classifies the failure by inspecting the error *message*
(not a status code — more on why in a moment) via `isSessionError()`, and
if it looks like an auth failure, redirects to `/auth/login` instead of
showing a broken page.

The message-based check exists for a subtle reason worth stating plainly,
because it's the kind of thing that looks like over-engineering until you
understand it: when this same "check the session" code runs during
server-side rendering, a failed request throws a `BackendApiError` object
with a real `.status` field (401, 403, whatever the backend sent). But
when the *identical* code runs from a client-side navigation — say, the
split second right after Aisha's signup redirect — it goes over TanStack
Start's client→server RPC bridge instead, and that bridge strips custom
error types down to a plain `Error` with only a `.message` string surviving
the trip. A status-code check that works perfectly in the SSR case would
silently do nothing on a client-side navigation. Classifying on the
message instead works in both places.

### Every mutation after this carries the same machinery

From here on, every time Aisha does something that changes data —
creates a plan, publishes it, cancels a subscription — the same request
pipeline runs (`backendRequest()` in `src/lib/api/backend.ts`):

1. Forward her `_subpilot_session` cookie.
2. If it's a mutating method (POST/PATCH/DELETE), read the `_subpilot_csrf`
   cookie and attach it as an `X-CSRF-Token` header.
3. Make the request.
4. If the backend comes back with 401 or 403 — and the request wasn't
   itself a login/signup/logout/refresh call, which are deliberately
   excluded to avoid an infinite loop — silently call
   `POST /v1/auth/refresh` with her refresh cookie, merge in whatever new
   `Set-Cookie`s that returns, and **retry the original request once**
   with the fresh session and a freshly re-attached CSRF header.
5. If even the refresh fails, the original 401/403 stands, and it flows
   back up through the same message-based `isSessionError()` check that
   sends her to `/auth/login`.

None of this is visible to Aisha. From her side, she just signed up and
ended up looking at a page titled "Overview."

### The empty overview

Because Loomstack doesn't have any plans yet, `/overview`
(`src/routes/_dashboard/overview.tsx`) shows its empty state rather than
the real dashboard: a "Welcome to SubPilot" heading, one line of copy —
"Create a plan to get a hosted checkout link you can share with
customers" — and a single "Create plan" button pointing at `/plans/new`.
Nothing on this empty-state screen has fetched any subscription or
revenue data yet; the route's loader only prefetches the plans list and
the subscriptions list, and the page checks `plans.length === 0` before
deciding what to render. Once Aisha creates her first plan, that
condition flips and the *real* overview page appears — active-subscriber
count, new-subscribers-in-30-days, past-due warnings, a recent-events
feed, and a recent-subscriptions table. That page is where the next
chapter of this story begins.

---

## 2. Building a product: plans, and a stranger becomes a customer

### Aisha creates a plan

She clicks "Create plan" and lands on `/plans/new`
(`src/routes/_dashboard/plans/new.tsx`). The form asks for a name, an
optional description, a price (entered in naira, converted to kobo — the
minor unit — before it's sent anywhere), a billing interval, an optional
trial length in days, and a proration policy: `none`, `credit`, or
`charge`, which decides what happens later if a customer switches plans
mid-cycle.

The interval picker offers all six values the backend's
`BillingIntervalDto` actually understands: Daily, Weekly, Monthly,
Quarterly, Yearly (called `annual` in the frontend's own interval type),
or Custom — a count and a unit (day/week/month), for something like
"every 3 weeks." This wasn't always true: for a while the create-plan
form only exposed four of the six (Monthly/Yearly/Weekly/Custom), even
though the backend, and the dashboard's own `formatInterval()` display
logic, were already fully ready for Daily and Quarterly plans — they were
just unreachable from this one screen. That gap is closed now.

Submitting calls `createPlan()` (`src/data/plans.ts`), which translates
the UI's interval shape into the backend's and fires:

```
POST /v1/plans
{ name, description, amount, currency: "NGN", billingInterval,
  intervalValue?, intervalUnit?, trialDays, prorationPolicy }
```

The plan comes back in `draft` status — created, but not yet shareable.
Aisha reviews it on the plan detail page and clicks **Publish**, which
calls `POST /v1/plans/{id}/publish`. The backend flips the plan to
`published` and returns a `hostedUrl`.

### A small correction the frontend has to make

Here's a detail that matters if you're reading the raw API response
directly: the `hostedUrl` the backend returns is shaped like
`/plans/{merchantSlug}/{planSlug}`, but the actual checkout page in this
app lives at `/pay/{merchantSlug}/{planSlug}` — a `/plans/...` prefix, not
`/pay/...`. Live re-verification (2026-07-02, a fresh plan created and
published against the real backend) confirms this is still the case, not
a stale note from an earlier gap sweep. It's a known, tracked mismatch
(`docs/BACKEND-GAPS.md` Gap 2), and the frontend quietly corrects for it
every time a hosted URL is displayed or copied: `normalizeHostedCheckoutTarget()`
and `checkoutUrl()` (`src/data/plans.ts`) parse whatever the backend
sent, pull out the merchant and plan slugs, and rebuild the path under
`/pay/...` before showing it to Aisha. She never sees the discrepancy;
she just copies a working link.

The same re-verification turned up the other half of this gap, which is
easy to miss because it's silent rather than wrong-looking: when Aisha
creates a plan with a `custom` interval — say, "every 3 weeks" — that
request sends `intervalValue: 3, intervalUnit: "weeks"` alongside
`billingInterval: "custom"`. Neither field comes back on any subsequent
read of that plan, not on creation, not on publish, not on a plain `GET`.
The frontend has nowhere to reconstruct "every 3 weeks" from, so
`intervalFromBackend()` (`src/data/plans.ts`) falls back to a generic
`{ kind: "custom_unknown", label: "Custom interval" }` the moment the
plan round-trips through the backend — Aisha's precise interval is
accepted on the way in and quietly flattened on the way back out. This
doesn't block anything (the plan still bills correctly; it's a display
fidelity issue, not a billing one), but it's why a custom-interval plan's
detail page reads "Custom interval" instead of "Every 3 weeks" after a
reload, even though the exact number was right there in the create form
a moment earlier.

### Tunde finds the checkout link

Aisha shares that `/pay/loomstack/monthly-membership`-style link with
Tunde — over email, on her own site, wherever. When he opens it, the
route's loader prefetches the plan via `publicPlanQueryOptions`, which
calls:

```
GET /v1/public/plans/{merchantSlug}/{planSlug}
```

This call is deliberately made with `forwardCookies: false` — it carries
no session, because there isn't one to carry. Tunde is a stranger to
SubPilot at this point. The response includes the plan's name, price,
trial length, and the merchant's display name, which is why the checkout
page can say "Loomstack" even though Tunde has never logged into
anything.

He fills in his full name, email, and phone number and submits. The page
shows a plain "Continue to payment" button — no loading spinner logic was
wired here at first, which is exactly the kind of thing that looks fine
until a slow network makes a button look unresponsive. It's now backed by
`useSlowState()` (`src/hooks/use-slow-state.ts`), which tracks the request
through 300ms/1500ms/4000ms thresholds and surfaces "Preparing your secure
checkout — almost there" and then "This is taking longer than usual"
messages if the request drags, rather than leaving Tunde staring at a
button that might or might not be doing anything.

The submit calls `initiatePublicCheckout()`, which fires:

```
POST /v1/public/plans/{merchantSlug}/{planSlug}/checkout
{ email, fullName, phone, merchantSlug, planSlug }
```

— again with no cookies attached. The backend creates a pending
subscription tied to a brand-new customer record and responds with
`{ subscriptionId, checkoutUrl, checkoutReference }`. The frontend's only
job at this point is `window.location.assign(checkoutUrl)` — it leaves
the SubPilot single-page app entirely and hands Tunde off to Nomba's own
hosted payment page, where he actually types his card number. SubPilot
never sees Tunde's card details; that's Nomba's job.

### Coming back, and an honest gap

Once Tunde pays, Nomba redirects his browser back to
`/plans/{merchantSlug}/{planSlug}/success?ref={subscriptionId}` — a URL
pattern the backend itself constructs (`SubscriptionService.java:91`,
referenced in `docs/backend-dev-todo.md`). This route
(`src/routes/plans.$merchantSlug.$planSlug.success.tsx`) shows a
confirmation message: payment received, subscription being confirmed,
can take up to 30 seconds.

That message is static on purpose, not because nobody got around to
making it live. The obvious thing to build would be a page that polls
"is my subscription active yet?" using the `ref` in the URL — but
`GET /v1/subscriptions/{id}` requires an authenticated *merchant* session,
and Tunde has none; a live test against that endpoint with no cookies at
all returns a plain `403`. There is currently no public, unauthenticated
way to ask "did subscription X activate?" A request for exactly that — a
slim `GET /v1/public/subscriptions/{id}/status` — is written up as a
feature request in `docs/backend-dev-todo.md`. Until it exists, this page
tells the truth about what it can't verify instead of faking a status
check.

Somewhere in the background — outside this repository, inside the
backend — Nomba's own webhook call to SubPilot is what actually flips
Tunde's subscription from pending to active and generates his first
invoice. That mechanism is covered in Chapter 4, where webhooks are
Aisha's tool rather than Nomba's.

---

## 3. Running the relationship: subscriptions and invoices

### Finding Tunde in the dashboard

A day later, Aisha opens `/subscriptions` and sees Tunde's subscription in
the list — `subscriptionsListQueryOptions()` behind the page joins raw
subscription records with customer and plan data so the table reads as
"Tunde Bakare — Monthly Membership — Active" rather than a wall of IDs.
Clicking through takes her to `/subscriptions/{id}`
(`src/routes/_dashboard/subscriptions/$subscriptionId.tsx`), which loads
three things in parallel: the subscription detail, the plans list (needed
for the change-plan picker), and every invoice tied to this subscription.

The detail page draws a small state-machine diagram of where this
subscription can legally go next — `trialing → active/cancelled`,
`active → past_due/paused/cancelled`, `past_due → active/cancelled/expired`,
and so on — so the available actions always match what the subscription's
current status actually permits.

### The actions Aisha can take

- **Cancel** — she chooses immediate or end-of-period, optionally leaves a
  reason, and it calls `POST /v1/subscriptions/{id}/cancel`. An
  end-of-period cancellation doesn't kill access right away; it sets
  `cancelAtPeriodEnd`, which shows up everywhere in the UI as a small
  "Cancels on {date}" indicator next to the status badge.
- **Pause** / **Resume** — `POST /v1/subscriptions/{id}/pause` and
  `.../resume`, straightforward status transitions.
- **Change plan** — the more interesting one. Aisha picks a new plan, and
  the confirmation calls `POST /v1/subscriptions/{id}/change-plan
  { newPlanId }`. The response isn't just "ok" — it's a real, backend-computed
  breakdown: `cycleDays`, `unusedDays`, `creditAmount`, `newPlanProrated`,
  `netChargeToday`, `netCreditForward`, whether the change
  `chargedImmediately`, and whether it `takesEffectNextCycle`. The UI
  shows this as a success toast — "Plan changed. ₦12,000 charged today,"
  or "...credited to your next invoice" — built entirely from real
  numbers the backend already calculated, not a client-side estimate.
  (An earlier version of this flow tried to preview the proration
  client-side before confirming; that was replaced with showing the
  backend's real numbers *after* confirming, since there's no preview
  endpoint and a fabricated estimate risked being wrong.)

### Invoices

`/invoices` lists every invoice across every subscription;
`/invoices/{id}` shows one in detail — gross amount, SubPilot's platform
fee, the net amount that lands with Aisha, and the billing period it
covers. The one mutation available here is **void**
(`POST /v1/invoices/{id}/void`), for the rare case an invoice needs to be
cancelled after the fact.

One thing that's deliberately *not* here: a per-invoice "payment attempts"
history — retry timestamps, failure reasons, that kind of forensic detail.
That data has nowhere to come from yet; the next chapter explains exactly
why, and what merchants get instead.

---

## 4. When things go wrong: dunning, webhooks, and the audit trail

### When Tunde's card gets declined

Say Tunde's card expires and his next renewal charge fails. This is where
**dunning** — the automated process of retrying a failed payment — takes
over. Every merchant has a dunning campaign (`/settings/dunning`,
`GET /v1/dunning/campaigns`); a default one is created automatically the
first time any of their payments fails, so a brand-new merchant with a
clean payment history sees an empty state until then. Aisha can configure
hers: a grace period in days (1–90) before the subscription is considered
truly at risk, a maximum number of retry attempts (1–10), whether to
cancel the subscription automatically once retries are exhausted, and a
sequence of **steps** — each one a day offset, an action (`retry_charge`,
`send_email`, or `both`), and, for email steps, which template to use
(`payment_failed`, `final_warning`, or `service_suspended`). Steps are
added, edited, and removed individually via
`POST`/`PATCH`/`DELETE /v1/dunning/campaigns/{id}/steps[/{stepId}]`.

What Aisha does *not* get, today, is a live view of "attempt 2 of 3 for
Tunde's invoice, retrying in 2 days." The underlying data exists in the
backend as `PaymentAttempt` and `DunningExecution` records, but neither
has a read endpoint exposed to merchants — they're written internally
during Nomba's payment-callback processing and never read back out. This
is a real, acknowledged gap (`docs/BACKEND-GAPS.md` Gap 4), and rather
than build a fake "attempt history" panel out of nothing, that UI was
removed entirely. What Aisha *can* see instead is the same activity
surfaced as ordinary events — `PAYMENT_FAILED`, `DUNNING_STARTED`,
`DUNNING_STEP_EXECUTED`, `DUNNING_RECOVERED` or `DUNNING_EXHAUSTED` —
in the events feed described below. Less structured, but real.

### Telling other systems what happened: webhooks

Loomstack has its own backend, and Aisha wants to know the moment a
subscription activates or a payment fails, without polling SubPilot for
it. That's what `/webhooks` is for. She registers an endpoint —
a URL, an optional description, and which event types she cares about,
picked from grouped categories (Plan, Subscription, Invoice, Payment,
Dunning, Refund) defined in `src/data/webhooks.ts`. This calls
`POST /v1/webhooks/endpoints { url, description?, events[] }`.

There's a naming quirk worth knowing about if you ever read the raw API
response: the field holding the endpoint's signing secret is called
`signingSecretHash`, which strongly implies it's a one-way hash you'd
never see again after creation — the usual "shown once" pattern, like an
API key. It isn't. Reading the backend's own webhook controller shows the
secret is generated with plain `SecureRandom` and Base64-encoded, never
hashed, and the same real, usable value comes back on every subsequent
`GET /v1/webhooks/endpoints` call too. So the frontend treats it
honestly: there's a "View signing secret" action on every endpoint,
any time, not just a one-time reveal dialog at creation
(`docs/BACKEND-GAPS.md` Gap 5 has the full detail, including a note that
the field name is still worth fixing on the backend even though the
behavior itself isn't a problem).

Every attempted delivery — success or failure, to any endpoint — shows up
in `/webhooks/deliveries` (`GET /v1/webhooks/deliveries`). Nomba's own
inbound webhook to SubPilot (`POST /v1/webhooks/nomba`, the call that
actually reports "this payment succeeded") is backend-only machinery, not
something this frontend calls or renders directly — it's the trigger
behind the scenes for the invoice creation and subscription activation
described in Chapter 2.

### The paper trail: events and audit log

Two different, deliberately separate views exist for "what happened."

`/events` is the business timeline — `GET /v1/events`, a feed of
`AuditEventDto` rows like `SUBSCRIPTION_ACTIVATED`, `INVOICE_PAID`,
`PLAN_PUBLISHED`. It answers "what happened, and when."

`/settings/audit-log` is a stricter, compliance-flavored view —
`GET /v1/audit-logs`, filterable by resource type/id or action, and
crucially including `actorId` and `actorType` (`user` or `api_key`) plus
full before/after JSON snapshots of whatever changed. It answers "*who*
did it, and exactly what changed" — a genuinely different question from
the events feed, not a duplicate of it, which is why both exist as
separate pages rather than being merged.

---

## 5. Understanding the business: analytics, revenue, and customers

### Two different views of money, on purpose

SubPilot gives Aisha two separate financial pages, and they answer
different questions.

`/analytics` is Aisha's view of *her own* business —
`GET /v1/analytics/summary?rangeDays=30` returns MRR, active subscriber
count, churn rate, payment success rate, failed-payment count and value,
and new subscribers in the window; four more chart endpoints
(`/charts/revenue`, `/charts/subscription-growth`,
`/charts/payment-success-rate`, `/charts/dunning-recovery-rate`) draw
trend lines over the same window, selectable as 7/30/90 days.

`/revenue` is SubPilot's own fee ledger — what Loomstack collected in
gross terms, what SubPilot's platform fee took, and what actually landed
as net revenue in Aisha's account (`GET /v1/fees/summary?days=`,
`GET /v1/fees/rate`). Its daily chart, unlike the analytics charts, isn't
its own backend endpoint — it's derived client-side from the invoices
list (`dailyChartForWindow` in `src/data/revenue.ts`), because no
reliable daily-granularity revenue endpoint exists yet. These two pages
were kept deliberately separate rather than merged into one, because they
genuinely serve different purposes: analytics is "how is my business
doing," revenue is "exactly what did SubPilot take and what's left."

### Everyone who's ever paid

`/customers` lists everyone who's subscribed to any of Aisha's plans —
name, contact info, card on file, and a rolled-up summary of their
subscriptions (how many active, how many past-due, and so on), built by
joining the customers list with the subscriptions list client-side.
Clicking into `/customers/{id}` shows one person's full subscription
history. This is Aisha's Rolodex — the same underlying customer records
that the checkout flow in Chapter 2 creates the moment someone like Tunde
first pays.

---

## 6. Customer self-service, and closing the loop

### Tunde manages himself

At some point Tunde wants to update his card, or switch to a cheaper
plan, or cancel outright — without emailing Aisha to do it for him. That's
what the customer portal is for, reachable at a link the backend emails
him (this frontend doesn't generate or send that link itself). The link's
authority isn't a login — it's a bare token in the URL,
`/portal/{subscriptionToken}`, and that token is literally the
subscription's own `subscriptionToken` field, not its database ID. No
cookies, no CSRF, nothing session-based; the token itself is the
credential, and every request the portal makes passes `forwardCookies:
false`.

The portal's layout route (`src/routes/portal.$token.tsx`) prefetches
`GET /v1/portal/{token}` before rendering anything. If the token is
wrong, expired, or was mistyped, that call 404s and Tunde sees "This link
is no longer valid — please contact the business to get an updated link"
instead of a broken page.

On the portal home, Tunde sees his plan name, price, next billing date,
current status, and the last four digits of his card. What he can
actually *do* here is limited to exactly three real backend actions:

- **Update card** — `POST /v1/portal/{token}/update-card` returns a fresh
  Nomba `checkoutUrl`, and the browser redirects there the same way
  Chapter 2's checkout did. When Nomba is done, it returns Tunde to
  `/portal/{token}/card-updated`, a confirmation page that shows his new
  card's brand and last four digits and then auto-redirects him back to
  the portal home after 8 seconds — cancelled immediately if he clicks,
  types, or scrolls, so it never yanks the page out from under him mid-read.
- **Cancel** — `POST /v1/portal/{token}/cancel`, with an optional reason,
  the same end-of-period cancellation semantics as the merchant side.
- **Change plan** — `/portal/{token}/plans` loads
  `GET /v1/portal/{token}/available-plans`; Tunde picks one and confirms,
  which calls `POST /v1/portal/{token}/change-plan` and shows the same
  kind of real, backend-computed proration toast Aisha sees on her side
  in Chapter 3 — not a fabricated estimate. (An earlier client-side
  proration calculator, `src/lib/proration.ts`, was removed entirely once
  the portal was wired to this real endpoint, for the same reason the
  merchant-side preview was dropped: a guess is worse than the real
  number, and the real number is one request away.)

Two things a customer might reasonably expect are conspicuously absent:
undoing a scheduled cancellation, and resuming a paused subscription
himself. Both were in an earlier, mock-data version of this portal, and
both were deliberately removed rather than kept — `PortalController` on
the backend exposes exactly three mutations (`cancel`, `change-plan`,
`update-card`), and neither "undo cancel" nor "resume" is one of them.
Faking a button that doesn't actually do anything would be worse than not
having it.

`/portal/{token}/invoices` rounds out the portal —
`GET /v1/portal/{token}/invoices`, a simple list with a detail view, the
same billing history Aisha sees on her side but scoped to Tunde alone and
requiring no login of his own.

### Back in the dashboard: the settings Aisha rarely opens

Two more pages close the loop on the merchant side. `/settings/account`
shows Aisha's business profile — read-only identity info plus her
checkout link prefix (`/pay/{merchantSlug}/`), derived from one of her
real published plans' `hostedUrl` rather than a hardcoded value, with a
copy button. `/settings/api-keys` is for anyone building against SubPilot
programmatically rather than through the dashboard — `GET
/v1/settings/api-keys` lists existing keys, `POST` creates one and shows
the raw key exactly once (it genuinely isn't retrievable again, unlike
the webhook secret quirk from Chapter 4), and `DELETE
/v1/settings/api-keys/{id}` revokes one.

---

## Appendix: every endpoint, by domain

This is the complete, confirmed set of backend endpoints this frontend
talks to — verified against the live OpenAPI spec
(`GET /v3/api-docs`) and cross-checked against every file in
`src/lib/api/`. Auth type: **merchant** = cookie session + CSRF,
**public** = no cookies, anyone can call it, **portal** = no cookies,
authenticated by the token in the URL path itself.

**Auth**
- `POST /v1/auth/signup` — create a merchant account · public (establishes session)
- `POST /v1/auth/login` — email/password login · public (establishes session)
- `POST /v1/auth/logout` — clear the session · merchant
- `GET /v1/auth/me` — fetch the current session · merchant
- `POST /v1/auth/refresh` — silently mint a new session from the refresh cookie · used internally, not called directly by any page

**Plans**
- `GET /v1/plans` / `GET /v1/plans/{id}` — list / detail · merchant
- `POST /v1/plans` — create · merchant
- `PATCH /v1/plans/{id}` — update name/description/trialDays · merchant
- `POST /v1/plans/{id}/publish` / `POST /v1/plans/{id}/archive` — lifecycle · merchant
- `GET /v1/public/plans/{merchantSlug}/{planSlug}` — fetch a plan for checkout · public
- `POST /v1/public/plans/{merchantSlug}/{planSlug}/checkout` — start checkout · public

**Subscriptions**
- `GET /v1/subscriptions` / `GET /v1/subscriptions/{id}` — list / detail · merchant
- `POST /v1/subscriptions/{id}/cancel` · `/pause` · `/resume` · `/change-plan` — lifecycle mutations · merchant

**Customers**
- `GET /v1/customers` / `GET /v1/customers/{id}` — list / detail · merchant

**Invoices**
- `GET /v1/invoices` (optional `subscriptionId` filter) / `GET /v1/invoices/{id}` — list / detail · merchant
- `POST /v1/invoices/{id}/void` — void · merchant

**Webhooks**
- `GET /v1/webhooks/endpoints` — list · merchant
- `POST /v1/webhooks/endpoints` — register · merchant
- `DELETE /v1/webhooks/endpoints/{id}` — remove · merchant
- `GET /v1/webhooks/deliveries` — delivery log · merchant
- `POST /v1/webhooks/nomba` — inbound payment-provider webhook · not called by this frontend

**Events & Audit**
- `GET /v1/events` — business event feed · merchant
- `GET /v1/audit-logs` — who-changed-what log · merchant

**Dunning**
- `GET /v1/dunning/campaigns` — list · merchant
- `PATCH /v1/dunning/campaigns/{id}` — update campaign settings · merchant
- `POST /v1/dunning/campaigns/{id}/steps` — add a step · merchant
- `PATCH` / `DELETE /v1/dunning/campaigns/{id}/steps/{stepId}` — edit / remove a step · merchant

**Analytics**
- `GET /v1/analytics/summary?rangeDays=` — MRR/churn/success-rate summary · merchant
- `GET /v1/analytics/charts/revenue` · `/subscription-growth` · `/payment-success-rate` · `/dunning-recovery-rate` — trend charts · merchant

**Fees / Revenue**
- `GET /v1/fees/summary?days=` — gross/fee/net summary · merchant
- `GET /v1/fees/rate` — the merchant's current fee rate · merchant
- `GET /v1/fees/ledger`, `GET /v1/fees/invoices/{invoiceId}` — exist in the spec, not currently used by this frontend

**API Keys**
- `GET /v1/settings/api-keys` — list · merchant
- `POST /v1/settings/api-keys` — create (raw key shown once) · merchant
- `DELETE /v1/settings/api-keys/{id}` — revoke · merchant

**Customer Portal** (token-scoped, no cookies)
- `GET /v1/portal/{token}` — subscription view
- `GET /v1/portal/{token}/invoices` — invoice list
- `GET /v1/portal/{token}/available-plans` — plans the customer can switch to
- `POST /v1/portal/{token}/cancel` — cancel
- `POST /v1/portal/{token}/change-plan` — switch plans, with real computed proration
- `POST /v1/portal/{token}/update-card` — start a Nomba card-update flow
