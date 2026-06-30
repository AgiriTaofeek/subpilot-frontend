# Webhooks (Deliveries)

## Purpose

Give the merchant a forensic log of webhook delivery attempts so downstream integrations can be debugged without guesswork.

## Primary actions

- Filter deliveries by endpoint, event type, status
- Inspect a delivery (request/response preview)

## Layout (desktop)

- Header: “Webhook deliveries”
- Filters:
  - Endpoint select
  - Status chips (Succeeded, Failed, Retrying)
  - Event type select
- DataTable columns:
  - Created at
  - Endpoint URL
  - Event type
  - HTTP status
  - Attempts
  - Status
  - Actions (View)
- Delivery detail drawer (Sheet on right):
  - Request summary (headers subset + body preview)
  - Response summary (status + body preview)
  - Timing metadata

## Layout (mobile)

- Filters in sheet.
- List becomes cards, tap opens full-screen sheet for detail.

## Components

- DataTable, Sheet, Select, Tabs/Chips, Code block styling for JSON previews

## Data + states

- Loading: skeleton.
- Empty: “No deliveries yet” with guidance to trigger an event.
- Error: inline error + retry.

## Visual direction

- This page should feel forensic and dependable.
- Failed or retrying deliveries should rise in the hierarchy faster than successful noise.
- The detail drawer should read like an inspection surface, with request and response clearly separated and easy to skim.

## Additional design notes

- **Detail sheet width:** 480px on desktop. Full-screen on mobile.
- **JSON payload block:** `<pre className="bg-muted text-muted-foreground font-heading text-xs rounded p-3 overflow-auto max-h-64">`. Copy button in the top-right corner of the block. No syntax highlighting required in v1 — monospace is sufficient.
- **Manual retry:** "Retry delivery" button in the detail sheet for deliveries with status `failed`. Triggers a POST to the retry endpoint. Button shows spinner while retrying, then refreshes the delivery status.
- **HTTP status colorization:** 2xx → `text-green-600`. 3xx → `text-muted-foreground`. 4xx → `text-amber-600`. 5xx → `text-destructive`. Applied to the status code column in the table and in the detail sheet.
- **Timing metadata in detail sheet:** Two lines — "Attempted at [ISO datetime]" and "Delivered in [Xms]" (or "Timed out after 10s" for timeouts). Use Geist Mono for the values.
