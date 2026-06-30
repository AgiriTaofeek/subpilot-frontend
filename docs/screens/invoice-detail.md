# Invoice (Detail)

## Purpose

Show a single invoice with full financial breakdown (gross/fee/net), payment attempt history, and safe administrative actions (void).

## Primary actions

- Void invoice (if allowed)
- View linked subscription and customer

## Layout (desktop)

- Header:
  - Invoice number
  - StatusBadge
  - Primary action: “Void” (disabled when already void/paid if policy disallows)
- Summary section (grid):
  - Period start/end
  - Customer
  - Subscription
  - Created at
- Amount breakdown (3 cards or a table):
  - Gross (NGN)
  - Platform fee (NGN)
  - Net (NGN)
- Payment attempts:
  - Table listing attempts with timestamp, status, reference, failure reason

## Layout (mobile)

- Amount breakdown is a vertical stack of cards.
- Attempts table becomes a list of expandable cards.

## Components

- StatusBadge, Card, Button, Dialog (confirm void), DataTable or list for attempts

## Data + states

- Loading: skeleton header + skeleton sections.
- Error: inline error + retry.

## Validation + errors

- Void confirmation dialog:
  - “Voiding stops collection. It does not refund.”
  - Confirm + Cancel
- Server errors: show backend `message`.

## Visual direction

- This page should feel like a financial record first, action surface second.
- Status and amount reality should dominate the page before supporting metadata or history.
- Payment attempts should read as a clear timeline of what happened, especially when collection failed.

## Additional design notes

- **Period display:** Format as "Jun 1, 2025 – Jun 30, 2025". Not raw ISO dates. Not epoch timestamps.
- **Platform fee breakdown:** Show as "₦1,350 (1.5% + ₦100 fixed)" in a secondary row under the fee amount. Tooltip explains the fee structure on hover.
- **Download/print:** Deferred to v2. Do not add a placeholder button or a greyed-out "Download PDF" link. Note this explicitly so it is not accidentally included.
- **Refund action:** If a `/refund` backend endpoint is available in v1, show "Refund" as a secondary ghost button in the header. Show it only for `paid` invoices. Refund triggers a Nomba Transfers API call — confirm dialog required.
- **Attempt history timeline:** Use the same vertical timeline format as the subscription dunning timeline. `Attempt [N] · [timestamp] · [status badge] · [failure_reason]`. Most recent at top.
- **Void button state:** Visible and enabled only on `open` invoices. Disabled (with tooltip "Cannot void a paid invoice") on `paid`. Hidden entirely on already-`void` invoices.
