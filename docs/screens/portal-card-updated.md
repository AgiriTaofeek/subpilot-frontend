# Portal (Card Updated)

## Purpose

Provide a clean landing state after the subscriber completes a Nomba checkout session for updating their card.

## Primary actions

- Return to portal overview
- View invoices

## Layout (desktop)

- Centered success card:
  - Title: “Card updated”
  - Description: “Your next billing will use the updated card.”
  - Primary button: “Back to subscription”
  - Secondary link: “View invoices”

## Layout (mobile)

- Full-width success card, buttons stacked.

## Components

- Card, Button, Icon (check), Alert

## Data + states

- This page can be static, but should optionally refetch the portal subscription to show updated card last4/brand.
- If refetch fails, still show success copy plus a “Back to subscription” action.

## Visual direction

- This page should feel like a clean exhale after a sensitive payment step.
- The success state should be centered and quiet, not celebratory or flashy.
- If updated card metadata is shown, it should support the reassurance, not compete with the primary success message.

## Additional design notes

- **Refetch on mount:** On arrival, fetch the portal subscription to get the updated `card_brand` + `card_last4`. Display below the success title as: "New card on file: Visa •••• 4827". This reinforces that the update worked.
- **If refetch fails:** Hide the card detail entirely. Keep the "Card updated" heading and both action buttons. Do not show an error — the card was already updated on the Nomba side.
- **Auto-redirect:** After 8 seconds with no user action, redirect to portal overview. Cancel the redirect if the user moves focus into the page. Do not show a countdown timer — the redirect should feel natural, not mechanical.
- **Success icon:** Use a check icon (Phosphor `CheckCircle`, size 40, `text-primary`) above the title. No animated confetti or celebration effects.
