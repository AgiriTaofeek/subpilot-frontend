# Plans (Detail)

## Purpose

Let the merchant view plan terms, publish/archive, and copy the hosted checkout URL once published.

## Primary actions

- Publish (draft only)
- Archive (draft/published)
- Copy hosted checkout URL (published)
- Edit allowed fields (name, description, trial days)

## Layout (desktop)

- Header:
  - Plan name
  - StatusBadge
  - Primary action button (Publish or Archive depending on status)
  - Secondary actions in dropdown: Archive, Edit
- Body:
  - Left column: plan terms (price, interval, trial, proration policy)
  - Right column:
    - Hosted checkout URL card (published only)
    - “Share instructions” card (copy link, where to use it)

## Layout (mobile)

- Header stacks vertically.
- Hosted URL card appears above plan terms for faster sharing.
- Actions become a sticky bottom bar when draft (Publish should remain one-tap).

## Components

- StatusBadge, Card, Button, DropdownMenu, Dialog (confirm publish/archive), Input/Textarea for edit mode

## Data + states

- Loading: skeleton header + skeleton cards.
- Error: inline error + retry.

## Validation + errors

- Publish confirmation dialog includes:
  - “Publishing makes this plan available publicly via its checkout link.”
  - Confirm + Cancel
- Archive confirmation dialog includes:
  - “Archived plans can’t be subscribed to, existing subscriptions continue.”

## Visual direction

- This page should make the plan feel like a real offer in market, not a configuration object.
- The hosted URL and publish state should be easier to notice than secondary metadata once the plan is live.
- Draft mode should create a sense of readiness and consequence, especially around the publish action.

## Additional design notes

- **Edit mode:** Inline — name and description fields become editable inputs in place (not a separate edit page or modal). Amount and billing interval are **read-only after creation** regardless of publish status. Editing them would invalidate existing subscriptions.
- **Active subscription count:** Show below plan terms — e.g., "4 active subscriptions". Link to `/subscriptions?planId={id}`. If 0, show "No active subscriptions."
- **Trial days edit:** Allowed for draft plans only. Read-only once the plan is published.
- **Hosted URL format:** Show the full URL — `/pay/{merchantSlug}/{planSlug}` — not just the slug. Copy button beside the full URL.
- **Publish dialog consequence copy:** "Once published, your plan is live at its checkout link. Amount and billing interval cannot be changed after publishing."
- **Archive dialog copy:** "Archived plans cannot receive new subscribers. Existing subscriptions are not affected."
