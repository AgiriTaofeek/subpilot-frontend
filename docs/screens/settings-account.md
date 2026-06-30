# Settings (Account)

## Purpose

Show the merchant’s account metadata clearly and avoid promising unsupported features (like password change) unless backend endpoints exist.

## Primary actions

- View account details

## Layout (desktop)

- Header: “Account”
- Card: “Profile”
  - Business name (read-only)
  - Email (read-only)
- Card: “Security”
  - Password row: “Password change is not available in v1.”

## Layout (mobile)

- Cards stacked, same content.

## Components

- Card, Input (read-only), Alert

## Data + states

- Loading: skeleton card.
- Error: inline error + retry.

## Visual direction

- This page should feel quiet and credible, not empty or unfinished.
- Read-only account metadata still needs hierarchy:
  - profile identity first
  - security constraints second
- Unsupported settings should feel intentionally deferred, not forgotten.

## Additional design notes

- **Three-card layout:**
  1. Card "Profile" — Business name (read-only), Email (read-only), Merchant slug (read-only + copy button)
  2. Card "Security" — Password row: `text-muted-foreground` "Password change is not available in v1."
  3. Card "Danger Zone" — Account deletion: `text-muted-foreground` "Account deletion is not available in v1. Contact support to close your account."
- **Merchant slug field:** Show the full checkout URL pattern: "Your checkout links use this slug:" then `/pay/{slug}/` as a Geist Mono inline code block with a copy button. The copy copies the base prefix.
- **Team members:** Not in v1. If a "Team" section placeholder is included, use the same deferred treatment: `text-muted-foreground` "Team management is not available in v1."
- **Deferred items must not look broken.** They should feel intentional — a calm `text-muted-foreground` sentence, not an empty card with a missing button.
