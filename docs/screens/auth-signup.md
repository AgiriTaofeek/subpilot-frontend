# Signup

## Purpose

Create a merchant account and first user, then drop them into the dashboard so they can publish a plan immediately.

## Primary actions

- Create account
- Navigate to login

## Layout (desktop)

- Centered card, max width ~520px.
- Header:
  - “Create your account”
  - support line: “Publish your first plan and start collecting recurring payments.”
- Form fields:
  - Business name
  - Email
  - Password
- Optional helper text: “You can change billing settings later.”

## Layout (mobile)

- Full-width card, stacked fields.
- Primary button sticky to bottom only if the form is long; otherwise normal flow.

## Components

- Card, Input, Label, Button
- Form: React Hook Form + Zod schema

## Visual direction

- This should feel like the first step into a serious product, not a generic sign-up wall.
- Keep one dominant card with generous spacing and a clear sense of momentum.
- The next step, publish your first plan, should be implied in the copy, not buried.

## Data + states

- Submitting: disable inputs, loading button.
- Success: backend `Set-Cookie` headers are passed through TanStack Start, then redirect to `/overview`.
- Error:
  - Email taken: inline under email field.
  - Weak password: inline under password field.
  - Network/server: toast.

## Accessibility + copy

- Autofocus business name.
- Password supports `autocomplete=”new-password”`.
- Copy emphasizes “publish your first plan” as the next step.

## Additional design notes

- **Fields:** Business name, Email, Password, Phone (optional). No password confirmation field — single field is correct UX here.
- **Backend mapping:** `business_name` → `merchant.name`. `email` + `password` → merchant user. `phone` → optional on merchant record.
- **Password requirements:** Minimum 8 characters. Show an inline strength hint (Weak / OK / Strong) below the field as the user types. Do not enforce complexity rules in v1.
- **No Terms of Service checkbox in v1.** Do not add one. Note this explicitly if asked.
- **No email verification in v1.** Account is active immediately on successful POST. Do not add a “check your email” interstitial.
- **Post-create flow:** Backend returns JWT + `Set-Cookie`. Redirect to `/overview` with a welcome toast: “Account created. Publish your first plan to get a checkout link.”
- **Error precedence:** Email-taken error renders inline under the email field. Weak password renders under password field. Server errors use a toast.
