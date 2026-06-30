# Settings (API Keys)

## Purpose

Let downstream developer teams generate and manage API keys safely.

This screen is a trust surface. It should feel precise, calm, and slightly more technical than the rest of the dashboard without becoming intimidating.

The UI must enforce shown-once behavior for raw keys and make irreversible actions feel deliberate.

## Primary actions

- Create API key
- Copy newly created raw key
- Revoke API key

## Layout (desktop)

- Header region:
  - Title: "API keys"
  - Support line: "Create keys for server-to-server access. Keep them secret and store them in your backend or environment manager."
  - Primary button: "Create API key"
- Top explanatory band:
  - A compact trust panel clarifying:
    - keys are shown once
    - keys should never be embedded in frontend code
    - revoked keys stop working immediately
- Main content uses a two-part hierarchy:
  - Left, larger region:
    - DataTable of existing keys
  - Right, narrower secondary panel:
    - "How to use keys safely"
    - short operational rules
    - small technical note using Geist Mono sparingly for `sk_live_****` style examples
- Table columns:
  - Prefix
  - Label
  - Created at
  - Last used
  - Status (StatusBadge)
  - Actions
- Row actions:
  - Revoke
  - No raw key reveal after creation
- Create key dialog:
  - Label input
  - Small helper text explaining what the label is for
  - Confirm button
- Post-create reveal modal:
  - Raw key displayed in a dedicated, high-legibility reveal block
  - Copy button is visually primary
  - Warning text:
    - "Copy this now. You won't see it again."
  - Secondary note:
    - "Store it in your server environment, not in browser code."

## Layout (mobile)

- Header stacks with the primary action still visible above the list.
- Trust guidance collapses into a compact info panel above the cards instead of a right rail.
- Table becomes cards:
  - label + status
  - prefix
  - created / last used metadata
  - overflow menu with Revoke
- Post-create reveal becomes a full-screen success flow with:
  - success title
  - raw key reveal block
  - sticky bottom copy button

## Components

- DataTable
- StatusBadge
- Dialog
- Input
- Button
- Alert
- DropdownMenu
- EmptyState

## Data + states

- Loading:
  - skeleton rows for the table
  - skeleton trust panel so the layout does not jump
- Empty:
  - Title: "No API keys yet"
  - Description: "Create a key when you are ready to connect a backend service or internal tool."
  - CTA: "Create API key"
  - Include one sentence clarifying that browser apps should not use secret keys
- Error:
  - inline error panel with retry
  - if key creation fails, keep the dialog open and attach the backend `message`

## Validation + errors

- Label is required and should help the merchant identify where the key is used, for example `Production billing worker`.
- Revoke requires confirmation with explicit consequence copy:
  - "Requests using this key will stop working immediately."
- Copy key:
  - toast confirmation
  - keep the key visible until the user dismisses the reveal modal
- If create succeeds but clipboard copy fails:
  - keep the key visible
  - show fallback guidance: "Copy manually before closing"

## Accessibility + copy

- The reveal block must be keyboard focusable and easy to select.
- The revoke confirmation must name the key label so the user knows exactly what they are disabling.
- Do not use scary language unless the action is destructive.
- Keep technical copy concrete:
  - good: "Use this key from your backend"
  - bad: "Use this credential to authenticate requests"

## Visual direction

- This page should feel like a secure control panel, not a generic settings table.
- The shown-once reveal is the loudest moment on the screen and should read with immediate seriousness.
- Use the existing semantic tokens for structure:
  - `card` / `card-foreground` for contained panels
  - `muted` / `muted-foreground` for supporting guidance
  - `primary` for the strongest copy action
- Avoid decorative code-editor aesthetics. This is still a product screen, not a developer marketing mockup.

## Additional design notes

- **Label naming guidance:** Surface as helper text in the create dialog — "Use a label that identifies where this key will be used, for example `Production billing worker` or `Staging integration tests`."
- **No rate limit on key creation in v1.** Do not display a "max N keys" warning unless the backend enforces one.
- **Revoke confirmation must name the key label:** "Revoke `Production billing worker`? Requests using this key will stop working immediately."
- **Key reveal block styles:** `font-heading text-sm bg-muted rounded p-3 select-all break-all`. `select-all` so a single click selects the whole key. Copy button to the right of the block with a toast "Key copied" on success.
