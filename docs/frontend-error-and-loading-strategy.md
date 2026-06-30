# Frontend Error And Loading Strategy

This document defines how SubPilot should feel when the network is slow, the backend is delayed, auth expires, or something fails.

It exists to prevent the usual mess:

- pages that go blank while loading
- random toast spam
- silent failures
- infinite spinners
- “it worked on my machine” happy-path UX

SubPilot is billing software. Trust matters more than flashy motion.

Users should always understand one of these states:

- loading
- saved
- retrying
- delayed
- failed
- signed out

---

## Core Principles

### 1. Always acknowledge user action immediately

If a user clicks a button, the UI should respond right away.

That response can be:

- button spinner
- disabled state
- optimistic row state
- skeleton for the next view

What it must never be:

- nothing

### 2. Never show blank space for required data

If a screen cannot render without data, show:

- page skeleton
- table skeleton
- card skeleton

Do not render an empty white area and hope the data arrives quickly.

### 3. Distinguish slow from broken

These are different states.

- **Slow**: request is still in flight
- **Broken**: request failed or timed out

Users should not have to guess which one happened.

### 4. Prefer recoverable UX

If a user can retry, say so.

If they need to sign in again, say so.

If the backend is still processing a webhook, say so.

### 5. Eventual consistency must be explicit

SubPilot is webhook-driven in critical places.

That means some important user-facing states are not immediate:

- checkout completed, but subscription not visible yet
- payment succeeded, but dashboard has not refreshed yet
- cancellation requested, but final state changes at period end

The UI must explain this, not hide it.

---

## State Model

Every important screen should be designed around the same state model.

```text
idle
  -> loading
      -> success
      -> empty
      -> slow
      -> error
      -> auth_expired
```

For mutations:

```text
idle
  -> submitting
      -> success
      -> retryable_error
      -> validation_error
      -> auth_expired
      -> server_error
```

---

## Loading Rules

### Page load

Use page-level skeletons for:

- `/overview`
- `/plans/:planId`
- `/subscriptions`
- portal overview
- revenue dashboard

### Table load

Use table skeletons for:

- subscriptions list
- invoices list
- customers list
- webhook deliveries
- events log

### Button load

Use button loading states for:

- login
- signup
- create plan
- publish plan
- cancel subscription
- change plan
- update card
- webhook endpoint create/delete

### Rules

- Keep labels visible when possible, for example `Publishing...`, `Signing in...`
- Disable duplicate submission while a mutation is in progress
- Preserve form values when submission fails

---

## Slow Request Strategy

Not every slow request is a bug, but every slow request needs UX.

### Recommended thresholds

These are UI thresholds, not backend SLAs.

- **0ms to 300ms**
  - show immediate control feedback only
  - avoid heavy skeleton flash if response is instant
- **300ms to 1500ms**
  - show skeleton / inline loading state
- **1500ms to 4000ms**
  - add “still loading” helper copy
- **4000ms+**
  - show stronger delayed-state message and retry affordance if safe

### Example copy

- `Loading subscriptions...`
- `Still fetching the latest subscription data...`
- `This is taking longer than usual. You can wait or retry.`

### Important rule

A slow request should not freeze unrelated UI.

Examples:

- slow overview KPIs should not block sidebar rendering
- slow secondary cards should not hide the whole page if the main data is already available

---

## Error Classification

The frontend should normalize backend/network failures into a small set of user-facing error types.

### 1. Validation error

Examples:

- invalid email
- weak password
- required field missing
- bad plan amount

Frontend behavior:

- show inline field errors when possible
- otherwise show the backend `message`
- keep user input intact

### 2. Auth expired

Examples:

- merchant session expired
- refresh failed
- cookies missing or invalid

Frontend behavior:

- clear protected app state
- redirect to `/auth/login`
- show message:
  - `Your session expired. Please sign in again.`

### 3. Forbidden

Examples:

- merchant tries to access a resource they should not see
- invalid portal token trying to use a merchant-only path

Frontend behavior:

- show forbidden state
- do not silently redirect unless the product decision explicitly says to

### 4. Not found

Examples:

- plan deleted or invalid id
- subscription no longer exists
- bad portal token

Frontend behavior:

- show not-found page or inline not-found panel
- give a next action if one exists

### 5. Network failure

Examples:

- backend unreachable
- browser offline
- DNS/tunnel failure

Frontend behavior:

- show:
  - `Couldn’t reach the server. Check your connection and try again.`
- offer retry
- do not show raw library error text

### 6. Server error

Examples:

- backend 500
- unexpected upstream failure
- malformed response

Frontend behavior:

- show general server error panel
- offer retry
- log enough context for debugging

### 7. Eventual-consistency delay

Examples:

- checkout succeeded but webhook processing is still in flight
- subscription not visible yet after payment

Frontend behavior:

- do not call this an error unless it actually failed
- show delayed/pending state with explanation

---

## Retry Rules

### Offer retry for

- GET requests that failed
- network failures
- timeout failures
- delayed dashboard refresh after webhook-driven actions

### Do not blind-retry automatically for

- destructive mutations
- checkout init if the endpoint is not idempotent
- plan publish unless the backend guarantees idempotency

### Mutation retry behavior

For mutations, prefer:

- clear error message
- preserved form state
- explicit retry button or re-submit

Over:

- hidden automatic retries that may duplicate actions

---

## Timeout Strategy

Timeout handling should exist at both technical and UX levels.

### Technical guidance

- backend client should use sane request timeouts
- timeout errors should be mapped to a retryable frontend state
- long polling should not be used unless there is a specific reason

### UX guidance

If a request times out:

- show that the request timed out
- say the user can retry
- if the action may still be processing server-side, say that too

Example:

- `This request took too long. It may still be processing. Refresh or try again in a few seconds.`

This matters for publish, checkout init, and webhook-driven visibility.

---

## Eventual Consistency UX

This is one of the most important sections in the whole frontend plan.

SubPilot is not fully synchronous. The user must be told when the system is waiting on backend processing.

### Critical delayed states

#### Checkout completed, subscription not visible yet

Show:

- success/pending confirmation state
- message:
  - `Payment received. We’re confirming your subscription now. This can take up to 30 seconds.`
- action:
  - `Refresh`

#### Merchant checks subscriptions immediately after payment

Show:

- delayed empty state, not “no subscriptions exist”
- message:
  - `A new subscription may still be processing. Refresh in a few seconds.`

#### Cancel at period end

Show:

- current active status
- additional indicator:
  - `Cancels on 12 Jul 2026`

#### Change plan with proration

Show:

- clear pending state during confirmation
- clear final state after backend response
- if charge is delayed, explain that confirmation may take a moment

---

## Mutation UX Rules

Every mutation should define:

- trigger state
- pending state
- success state
- failure state
- retryability

### Required mutation safeguards

- disable duplicate submit while pending
- keep user input on failure
- surface backend `message`
- invalidate related queries on success
- never leave stale success UI after failed mutation

### Mutations that need extra care

- login
- signup
- create plan
- publish plan
- checkout init
- cancel subscription
- change plan
- update card
- webhook endpoint create/delete

---

## Page-Level Rules

### Marketing pages

- Should feel instant
- If content is static, avoid heavy loading states
- CTA buttons should still show pending if they trigger navigation with work

### Auth pages

- Inline validation first
- Submission errors near form header and relevant fields
- Auth-expired redirect messages should be visible, not swallowed

### Dashboard pages

- Required data gets skeletons
- Tables get skeleton rows
- Empty state is different from error state
- Slow states get copy, not just endless shimmer

### Public checkout

- Fast perceived load matters most here
- Form submit must acknowledge instantly
- If checkout init is slow:
  - `Preparing secure checkout...`
- If checkout init fails:
  - explain clearly and allow retry

### Portal

- Minimal chrome
- High clarity
- Subscriber should always understand current status and next action

---

## Error Copy Rules

Good copy:

- `Couldn’t reach the server. Please try again.`
- `Your session expired. Please sign in again.`
- `We’re still confirming this payment. Refresh in a few seconds.`
- `This plan could not be published right now. Try again.`

Bad copy:

- `Request failed with status code 500`
- `AxiosError: Network Error`
- `Something went wrong`

Use backend `message` when it is safe and clear.

If the backend message is technical or poor, map it to cleaner product copy.

---

## Observability Expectations

The UI should help users, but it should also help developers debug.

### Log internally

- request failure category
- route/action name
- correlation id if backend supports it
- whether retry was offered

### Never expose to users

- stack traces
- raw Axios/internal error objects
- sensitive identifiers or secrets

---

## Critical Failure Modes To Design Around

These must not be accidental afterthoughts.

### Merchant session expired during publish

User sees:

- action stops
- redirect to login
- message that session expired

### Checkout initiated but redirect fails

User sees:

- failed checkout-init message
- retry action

### Payment succeeded but webhook is delayed

User sees:

- confirmation pending state
- explanation that processing may take up to 30 seconds

### Two rapid clicks on a mutation

User sees:

- one pending action only
- no duplicate plan creation or duplicate cancellation request

### Subscriptions page loads before webhook finishes

User sees:

- delayed empty state
- not a misleading “you have no subscriptions” final state

### Refresh fails during active dashboard use

User sees:

- session-expired redirect
- no stale protected UI pretending everything is fine

---

## What Already Exists

The repo already has the concept of:

- `EmptyState`
- shared layout shells
- TanStack Query
- route-based surfaces

What this doc adds is the missing decision layer:

- when to show skeletons
- when to show delayed-state copy
- how to classify errors
- what retry means
- how to handle webhook-driven latency

---

## Definition Of Done

A frontend slice is not done unless:

- loading state exists
- empty state exists
- error state exists
- slow-state copy exists where delay is realistic
- retry behavior is defined
- auth-expiry behavior is defined for protected flows
- eventual-consistency behavior is defined for webhook-driven flows

That is the quality bar.

