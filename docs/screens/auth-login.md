# Login

## Purpose

Let a merchant user log into the dashboard with as little friction and anxiety as possible, then land in the dashboard with backend-owned cookie auth flowing through TanStack Start.

## Primary actions

- Log in
- Navigate to sign up

## Layout (desktop)

- Centered card, max width ~420px.
- Header: product mark + “Log in”.
- Optional support line under heading:
  - “Manage plans, subscriptions, revenue, and webhook activity.”
- Form fields:
  - Email
  - Password (with show/hide toggle)
- Footer links:
  - “Create an account” → `/auth/signup`

The screen should feel lighter and cleaner than the dashboard, but still within the same product family.

## Layout (mobile)

- Full-height layout with a centered card or full-width card with comfortable padding.
- Primary button is full width.

## Components

- Card, Input, Label, Button
- Form: React Hook Form + Zod schema
- Toast for non-field errors (network/server)

## Visual direction

- Keep this screen intentionally minimal.
- One clear heading, one support line, one form, one path forward.
- Do not add dashboard chrome or marketing-section clutter.
- Use the existing token system for subtle depth, but keep the auth card as the single anchor.

## Data + states

- Submitting: disable inputs, show loading state on button.
- Success: backend `Set-Cookie` headers are passed through TanStack Start, then redirect to `/overview`.
- Error:
  - Invalid credentials: show inline error under password: “Incorrect email or password.”
  - Validation: inline field errors (“Enter a valid email.”)
  - Network: toast “Couldn’t reach the server. Check your connection.”

## Accessibility + copy

- Autofocus email.
- Enter submits.
- Password field supports password managers (`autocomplete="current-password"`).
- Email field: `autocomplete="email"`.
- Copy is short and non-technical.

## Additional design notes

- **Forgot password:** Deferred to v2. No link shown in v1. Do not add a placeholder or greyed-out link.
- **Cookie lifetime:** Session cookie, cleared on browser close. No "Remember me" checkbox in v1.
- **Error precedence:** Field-level errors (`invalid email`, `incorrect password`) render inline beneath the relevant field. Network/server errors use a toast. Never show two error surfaces simultaneously for the same submission.
- **Loading state:** Button text changes to `Logging in…` with a spinner. Inputs remain enabled so the user can correct and resubmit after a failure.
