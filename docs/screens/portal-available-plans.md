# Portal (Change Plan)

## Purpose

Let a subscriber switch plans with a clear proration preview before confirming.

## Primary actions

- Select new plan
- Preview proration
- Confirm change

## Layout (desktop)

- Header: “Change plan”
- Step 1: available plans list (cards)
  - Plan name
  - Price + interval
  - Short description (optional)
- Step 2: proration preview card
  - Credit amount (if any)
  - Charge amount (if any)
  - Effective date
  - Plain-language summary (“You’ll be charged ₦X today” or “Your next invoice will be reduced by ₦X”)
- Step 3: confirm

## Layout (mobile)

- Steps are stacked vertically.
- Proration preview is a prominent card before the confirm button.
- Confirm button full width.

## Components

- Card, Button, RadioGroup or selectable cards, Alert

## Data + states

- Loading: skeleton cards.
- Error: inline error + retry.
- Empty: “No alternative plans available.”

## Validation + errors

- Confirm action requires an explicit “Confirm change” button.
- Prevent double submits.

## Visual direction

- This page should feel careful and transparent, not promotional.
- The selected plan and the proration consequence should dominate the hierarchy more than the list of alternatives.
- Do not make alternative plans look like marketing pricing cards. They are decision surfaces inside a trust flow.

## Additional design notes

- **Current plan highlighting:** The subscriber's current plan card gets a "Current plan" Badge (`variant="secondary"`). Its "Select" button is replaced with a disabled "Current" label. Do not allow selecting the current plan.
- **Empty state:** "No alternative plans are available at this time." No CTA. This is a dead end — do not link back to a plan catalogue.
- **Proration preview (inline, not a separate page):** After the subscriber selects a plan, a proration summary card appears inline below the plan list before the confirm step. Copy: "You'll be charged ₦X today, reflecting the remaining days on your current plan." or "A credit of ₦X will be applied to your next invoice." depending on direction.
- **Confirm step:** "Confirm change" button is primary. Cancel link returns to portal overview. No back button to the plan list once the proration preview is shown — use a "Change selection" link instead.
- **No promotional language.** Plans are listed with name, price, interval, and description only. No "Most popular" badges or feature comparison.
