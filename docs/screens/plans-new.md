# Plans (Create)

## Purpose

Create a plan with correct money handling and interval semantics, so the merchant can publish it and start onboarding subscribers.

## Primary actions

- Create plan
- Cancel

## Layout (desktop)

- Two-column form:
  - Left: core plan fields
  - Right: “Summary” panel showing the computed commercial display (price, interval, trial) and a short “What happens when published” note

### Fields

- Name
- Description (optional, multiline)
- Amount (AmountInput, NGN UI, submits kobo)
- Billing interval:
  - Presets: Monthly, Yearly, Weekly
  - Custom: “Every” + number + unit (days/weeks/months)
- Trial days (optional)
- Proration policy (radio group):
  - None
  - Credit
  - Charge

## Layout (mobile)

- Single column, grouped sections:
  - “Basics”
  - “Billing”
  - “Trial”
  - “Proration”
- Primary action button full width at bottom.

## Visual direction

- This screen should make pricing feel concrete and publishable, not like filling out a settings form.
- The summary side should feel commercially legible:
  - plan name
  - formatted price
  - interval
  - short customer-facing preview
- The user should feel they are assembling a sellable offer, not merely entering fields.

## Components

- Form: React Hook Form + Zod
- Card, Input, Textarea, Select, RadioGroup, Button
- AmountInput

## Data + states

- Submitting: disable, show spinner on button.
- Success: redirect to plan detail and show toast “Plan created”.
- Errors:
  - Backend validation: surface `message` near the relevant field if possible, otherwise at top of form.

## Accessibility + copy

- Inline helper text for proration explains in one sentence.
- Currency is always shown as NGN display (formatting), never raw kobo.
- “What happens when published” should explain the outcome in merchant language:
  - “You’ll get a shareable checkout link at `/pay/{merchantSlug}/{planSlug}`.”

## Additional design notes

- **AmountInput:** User types the NGN display value (e.g., “5000”). The component stores and submits kobo (500000). Never show or accept raw kobo in the UI.
- **Custom interval UX:** Presets (Monthly, Yearly, Weekly) are shortcuts that set N + unit. Custom mode reveals “Every [N] [days/weeks/months]” — N is a number input (min 1), unit is a Select. Both are required when custom is active.
- **Dirty-state navigation guard:** If the form has any unsaved user input, show a browser-native confirmation prompt “Leave without saving?” on navigation away. (TanStack Router `onBeforeLoad` or `beforeUnload` event.)
- **Description max length:** 500 characters. Show a character counter below the textarea (e.g., “340 / 500”). Textarea does not hard-block input at 500 — backend validation catches it.
- **Summary panel:** Live-updates as the user types — no submit required for the preview. Shows: plan name, formatted price + interval, trial info (if any), and “What happens when published” copy. If name is empty, shows placeholder text.
- **Proration radio group helper text:** “None — no adjustment for mid-cycle changes. Credit — unused days refunded to next invoice. Charge — subscriber pays for remaining days immediately.”
