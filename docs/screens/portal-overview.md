# Portal (Overview)

## Purpose

Let a subscriber see their subscription status, next billing date, plan details, and manage core actions without contacting the merchant.

## Primary actions

- Cancel subscription (at period end)
- Update card
- Change plan

## Layout (desktop)

- Minimal header: merchant name + subtle “Customer portal”.
- Summary card:
  - Plan name
  - StatusBadge
  - Next billing date
  - Amount + interval
  - Card on file (brand + last4)
- Actions row:
  - Primary: “Update card”
  - Secondary: “Change plan”
  - Destructive: “Cancel subscription”
- Secondary section:
  - Link to invoices

The layout should clearly separate:

- current subscription state
- what action is safe to take next
- what happens after that action

## Layout (mobile)

- Summary card first.
- Actions become stacked buttons:
  - Update card (primary)
  - Change plan
  - Cancel subscription (destructive outline)

## Visual direction

- This screen should feel safe, respectful, and low-stress.
- Subscribers should immediately understand:
  - what plan they are on
  - whether access is active
  - when they will be billed next
  - what each action changes
- Avoid merchant/internal language unless explained.

## Components

- Card, Button, StatusBadge, Dialog, Alert

## Data + states

- Loading: skeleton summary card.
- Error:
  - Invalid/expired token: “This link is no longer valid. Contact the merchant.”
- Empty: not applicable (token resolves to one subscription or error).

## Validation + errors

- Cancel dialog:
  - Confirm text: “Cancels at the end of the current period.”
  - Optional reason

For every action, include outcome copy:

- Update card: “You’ll be redirected to a secure Nomba flow.”
- Change plan: “We’ll show any credit or additional charge before you confirm.”
- Cancel: “Your access continues until the end of the current billing period.”

## Accessibility + copy

- Explain that cancelling does not remove access immediately (unless plan says otherwise).
- Keep copy subscriber-friendly, avoid internal status terms without explanation.

## Additional design notes

- **State matrix — what the UI shows per subscription status:**
  - `active` / `trialing`: full actions row (Update card, Change plan, Cancel)
  - `past_due`: show an amber alert "Your payment is being retried. We'll notify you." Actions still available.
  - `cancelled` (scheduled cancel): "Cancel" button changes to "Undo cancellation". Copy: "Your access continues until [period_end_date]."
  - `cancelled` (immediate / expired): Show "Your subscription has ended." No action buttons except "View invoices".
  - `paused`: Show "Billing is paused. Your access continues." Primary action becomes "Resume billing."
  - `expired`: Show "Your subscription expired on [date]." No action buttons.
- **Token expiry / invalid token:** Show a centered error card: "This link is no longer valid. Please contact the business to get an updated link." No portal chrome around it.
- **"Cancel at period end" scheduled state:** Once the cancellation is scheduled, the Cancel button label changes to "Undo cancellation". Below the summary card: "Your subscription will end on [period_end_date]. You'll keep access until then."
