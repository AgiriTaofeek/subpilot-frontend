# Portal (Invoices)

## Purpose

Let a subscriber view their invoice history in a simple, trustworthy format.

## Primary actions

- View invoice details (optional)

## Layout (desktop)

- Header: “Invoices”
- List/table:
  - Date
  - Invoice number
  - Amount (NGN)
  - Status (StatusBadge)
- Optional detail view:
  - If an invoice is tapped, show a detail sheet with a breakdown.

## Layout (mobile)

- Card list with:
  - Date + status
  - Amount
  - Invoice number

## Components

- DataTable (desktop) or list, StatusBadge, EmptyState

## Data + states

- Loading: skeleton list.
- Empty: “No invoices yet” (trial state or newly created subscription).
- Error: inline error + retry.

## Visual direction

- This page should feel simpler and softer than the merchant invoice list.
- Invoice amount and status should scan first, because that is what the subscriber cares about.
- Keep the tone reassuring, especially for failed or open invoices.

## Additional design notes

- **Download invoice per row:** Show a ghost "Download" button or icon link per row if the backend supports PDF generation. If not supported in v1, note this explicitly and omit any placeholder.
- **Empty state nuance:**
  - Trial subscription with no invoices: "No invoices yet. Your first invoice will appear after your trial ends."
  - Newly created subscription: "No invoices yet. Invoices appear after each billing cycle."
  - Unexpected empty (subscription should have invoices): "No invoices found." (terse, non-alarming).
- **Status labels on subscriber-facing invoices:** Do not show the internal "Failed" label. Replace with "Payment pending" with a secondary note "We'll try again soon." Subscribers should not see raw failure states — they should understand what's happening, not what the system calls it.
- **Amount column:** Always formatted NGN via `formatNGN()`. Show total charged (gross), not net (which includes SubPilot fees the subscriber doesn't need to know about).
