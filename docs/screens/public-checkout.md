# Public Checkout (Plan Page)

## Purpose

Convert a subscriber from intent to a Nomba checkout session. This is the top-of-funnel page the merchant shares.

## Primary actions

- Start checkout

## Layout (desktop)

- Minimal header: SubPilot logo + merchant name.
- Two-column:
  - Left: plan details
    - Plan name
    - Description
    - Price + interval
    - Trial info (if any)
    - Trust copy (“Secure checkout powered by Nomba”)
  - Right: checkout form card
    - Full name
    - Email
    - Phone
    - Primary button: “Continue to payment”

This page must feel like a secure handoff, not a raw internal form.

## Layout (mobile)

- Single column.
- Checkout form appears first or second depending on content length. Prefer:
  - Plan name + price at top
  - Form immediately after
  - Full plan description below
- Primary button full width and sticky if the keyboard hides it.

## Visual direction

- Price and interval should be one of the first two things the user notices.
- Merchant identity and secure-payment trust cue should be visible without scrolling.
- The form should feel lighter than a dashboard card and more trustworthy than a generic checkout embed.
- Avoid clutter. This screen has one job.

## Components

- Card, Input, Label, Button, Separator, Alert

## Data + states

- Loading: skeleton for plan name/price and form.
- Error:
  - Plan not found/unpublished: show a friendly “This plan isn’t available” message.
  - Checkout init failure: inline error in the form card plus retry.
- Slow:
  - if checkout init takes longer than usual, show:
    - “Preparing secure checkout...”
    - after delay, explain that the redirect may take a few more seconds
- Success:
  - After POST checkout-init returns `checkoutUrl`, redirect the browser to the Nomba URL immediately.

## Validation + errors

- Inline validation for email and phone.
- Prevent double submit. If the user taps twice, second submit is ignored.

## Accessibility + copy

- Explain what happens next: “You’ll be redirected to Nomba to enter your card details.”
- Add a short trust reassurance near the CTA:
  - “Secure checkout powered by Nomba. SubPilot does not collect your card details on this page.”
- Never show internal IDs or technical errors.

## Additional design notes

- **Merchant branding:** Show `merchant.name` prominently in the header (Geist Mono, `text-sm`) as a trust anchor. If the backend returns a merchant logo URL (v2 feature), render the `<img>`. In v1: name only.
- **Return URL flow:** After the Nomba checkout session is complete, Nomba redirects the browser to a return URL. Add a `/checkout/return?ref={orderReference}` intermediary screen that:
  1. Shows a loading spinner: “Confirming your payment…”
  2. POSTs to the backend to verify the transaction reference
  3. On success: shows a brief success state then redirects to the portal (`/portal/{token}`)
  4. On failure: shows an inline error with a “Try again” button that restarts the checkout
- **Double-submit prevention:** On the “Continue to payment” button click, the button immediately becomes a non-interactive spinner (disabled + loading state). A second click is ignored. This prevents duplicate checkout sessions.
- **Slow checkout init:** If the POST to initiate checkout takes > 3 seconds, show helper text below the spinner: “Preparing your secure checkout — almost there.” If > 10s, offer: “This is taking longer than usual. Check your connection or try again.”
