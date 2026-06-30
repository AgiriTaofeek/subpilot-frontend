# Events (Audit Log)

## Purpose

Expose an internal event stream so operators can answer “what happened?” without database access.

## Primary actions

- Filter by event type
- Filter by subscription ID
- Inspect payload preview

## Layout (desktop)

- Header: “Events”
- Filters:
  - Event type select
  - Subscription ID search
- DataTable columns:
  - Timestamp
  - Type
  - Resource (subscription/customer/invoice)
  - Resource ID
  - Payload preview (truncated)
  - Actions (View JSON)
- Detail modal/sheet:
  - Full JSON payload with copy button

## Layout (mobile)

- Filters in sheet.
- Cards show timestamp + type + resource, tap opens JSON view.

## Components

- DataTable, Select, Input, Sheet/Dialog

## Data + states

- Loading: skeleton.
- Empty: “No events yet” with suggestion to create a plan or run a checkout.
- Error: inline error + retry.

## Visual direction

- This page should feel like a readable event stream, not a blob of machine output.
- Event type and time should scan first, while payload preview stays secondary until the user chooses to inspect.
- The JSON view should feel clean and easy to inspect, with strong separation between metadata and raw payload.

## Additional design notes

- **Event type filter select — grouped options:**
  - Subscription: `subscription.activated`, `subscription.cancelled`, `subscription.past_due`, `subscription.paused`, `subscription.resumed`, `subscription.expired`
  - Invoice: `invoice.paid`, `invoice.void`
  - Payment: `payment.succeeded`, `payment.failed`
  - Plan: `plan.published`, `plan.archived`
  - Customer: `customer.created`
  - Webhook: `webhook.delivery.succeeded`, `webhook.delivery.failed`
- **Resource ID display:** Truncated to 14 chars with Geist Mono styling in the table. Full ID in a tooltip on hover. Click-to-copy behavior.
- **JSON view:** Right-side Sheet, 480px wide on desktop. Full-screen on mobile. Raw payload in a Geist Mono `<pre>` block with copy button top-right. Close (X) button top-left of the sheet.
- **Timestamp display:** Relative time ("3 minutes ago") in the table column. Full ISO 8601 in a tooltip on hover.
- **Payload preview column:** Truncate the stringified payload preview at 80 characters with "…". Never dump raw JSON into the table cell.
