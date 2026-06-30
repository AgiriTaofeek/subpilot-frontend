# Webhooks (Endpoints)

## Purpose

Let downstream product teams register webhook endpoints, choose which events they care about, and manage endpoints safely.

## Primary actions

- Register endpoint
- Delete endpoint
- Navigate to deliveries

## Layout (desktop)

- Header:
  - Title: “Webhooks”
  - Secondary button: “View deliveries”
  - Primary button: “Register endpoint”
- Endpoints table:
  - URL
  - Description
  - Subscribed events count
  - Active status
  - Created at
  - Actions (Delete)
- Register endpoint flow (dialog or sheet):
  - URL
  - Description
  - Event type checklist (grouped by domain: subscription, invoice, payment)

## Layout (mobile)

- Register flow uses a full-screen sheet.
- Endpoint list becomes cards with delete in overflow menu.

## Components

- DataTable, Dialog/Sheet, Input, Checkbox, Button, EmptyState

## Data + states

- Loading: skeleton rows.
- Empty: “No webhook endpoints” with CTA to register.
- Error: inline error + retry.

## Validation + errors

- URL validation (must be https for production environments).
- Delete confirmation dialog.

## Visual direction

- This page should feel like an integration control surface, not a generic settings screen.
- Endpoint identity, delivery health access, and event scope should be easier to scan than descriptive filler copy.
- Use technical accents sparingly so the page feels credible without becoming visually harsh.

## Additional design notes

- **Signing secret reveal:** Immediately after a successful endpoint registration, show a reveal modal (same pattern as API keys). Raw signing secret in a Geist Mono block with a copy button. Warning: "Copy this now. You won't see it again." Dismiss closes the modal — no way to recover the raw secret.
- **Event type checklist groups (in the register dialog):**
  - **Subscription:** `subscription.activated`, `subscription.cancelled`, `subscription.past_due`, `subscription.paused`, `subscription.resumed`, `subscription.expired`
  - **Invoice:** `invoice.paid`, `invoice.void`
  - **Payment:** `payment.succeeded`, `payment.failed`
- **HTTPS enforcement:** If the endpoint URL starts with `http://` (not localhost), show an inline warning: "Production endpoints must use HTTPS." Allow `http://localhost` for local development.
- **Delete confirmation dialog copy:** "Deleting this endpoint will permanently stop all event deliveries to `{url}`. This cannot be undone."
- **"Select all" shortcut:** Checkbox at the top of each group to select/deselect all events in that group.
