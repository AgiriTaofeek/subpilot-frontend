# Subscription (Detail)

## Purpose

Make the subscription state machine and its operational reality obvious: current status, next billing action, dunning state when applicable, and safe control actions.

## Primary actions

- Cancel (immediate or at period end)
- Pause / Resume
- Change plan (with proration preview)

## Layout (desktop)

- Header:
  - Customer name + email
  - StatusBadge
  - Key actions grouped on the right (Cancel, Pause/Resume, Change plan)
- Summary grid (2–3 columns):
  - Plan name + amount + interval
  - Current period (start → end)
  - Next billing date
  - Payment method (brand + last4 + expiry if available)
- State machine diagram section:
  - Small diagram showing valid transitions with the current state highlighted.
- Dunning section (only when status is `past_due`):
  - A prominent “Payment failed” card
  - Next retry date/time
  - Last failure reason
  - Attempt history timeline
- Invoices table (last 10):
  - Invoice number, date, amount, status, view link

The subscription detail page should feel like a high-trust control room, not a long admin form.

## Layout (mobile)

- Actions become a sticky bottom bar:
  - Primary: “Cancel”
  - Secondary: “Pause/Resume”, “Change plan” via overflow menu
- State machine diagram collapses into a compact “State” card with:
  - Current status + short explanation
  - “See full state diagram” opens a modal with the diagram
- Invoices show as card list.

## Visual direction

- Current status and next billing reality should dominate the page.
- Dunning state, when present, should visually interrupt the calm layout enough to feel urgent, but not chaotic.
- The state-machine section should educate without becoming diagram theater.
- Safe actions should feel deliberate. Avoid putting three equally loud destructive or sensitive buttons side by side.

## Components

- StatusBadge
- Dialogs for confirmations
- Sheet or Dialog for Change plan flow
- Timeline component for dunning attempts (simple vertical list is acceptable)

## Data + states

- Loading: skeleton header + skeleton cards + skeleton table.
- Error: inline error + retry.

## Validation + errors

- Cancel dialog:
  - Option selector: “Cancel now” vs “Cancel at period end”
  - Textarea for optional reason
- Change plan:
  - Step 1: select new plan
  - Step 2: proration preview (credit/charge amounts)
  - Step 3: confirm

## Accessibility + copy

- The dunning card explains next steps in plain English.
- Avoid exposing internal error codes, prefer a human summary plus “View attempt details”.
- On mobile, the sticky action bar should never hide critical subscription state or invoice context.

## Additional design notes

- **State machine diagram visual spec:** Horizontal node row. Each state is a circle (32px) with the status name below in `text-xs font-heading`. Connecting arrows with short transition labels. Current state: `border-primary bg-primary/10`. Adjacent reachable states: `border-muted-foreground/40`. Unreachable states for current status are hidden entirely (not greyed out — just absent).
- **Dunning attempt timeline:** Vertical list with a `border-l-2 border-muted pl-4` left-border connector. Each item: `Attempt [N] · [date/time] · [status badge] · [failure_reason in plain English]`. Most recent attempt at top.
- **Pause dialog copy:** “Pausing stops billing. The subscriber keeps access until their period ends. Billing resumes when you manually resume.” Option to set auto-resume date is **v1 deferred** — manual resume only.
- **Cancel dialog:** Radio group with “Cancel at period end” (default, recommended) and “Cancel immediately”. Then an optional reason textarea. Copy under “Cancel immediately”: “The subscriber loses access now.”
- **Change plan flow:** Opens in a right-side Sheet (480px). Step 1: plan picker (selectable cards). Step 2: proration summary card (charge or credit amount + effective date). Step 3: “Confirm change” button. Back button returns to Step 1.
