# Subscriptions (List)

## Purpose

Give merchants an operational view of all subscriptions, with fast filtering by state and plan, and clear visibility into risk (`past_due`).

## Primary actions

- Filter by status and plan
- View subscription detail

## Layout (desktop)

- Header:
  - Title: “Subscriptions”
- Filter row:
  - Status chips (horizontal): Trialing, Active, Past due, Paused, Cancelled, Expired
  - Plan select (optional)
  - Search: customer email/name
- DataTable columns:
  - Customer (name + email)
  - Plan
  - Status (StatusBadge)
  - Next billing date
  - Current period end
  - Amount (NGN)
  - Updated at
  - Actions (View)

## Layout (mobile)

- Status chips scroll horizontally.
- Plan filter + search move into a “Filters” sheet.
- List becomes cards:
  - Top: customer + status
  - Middle: plan + amount
  - Bottom: next billing date
  - A “Past due” card includes a warning tone and shows “Next retry” if available.

## Components

- DataTable, StatusBadge, Select, Input, Sheet (mobile filters), EmptyState

## Data + states

- Loading: table skeleton / cards skeleton.
- Empty:
  - If no subscriptions: “No subscriptions yet” with explanation that subscriptions appear after checkout completes.
- Error: inline error + retry.

## Visual direction

- This page should feel like an operations queue, not just a record list.
- Risky states, especially `past_due`, should interrupt the calm enough to be noticed without turning the page into a warning board.
- Customer identity and next billing reality should scan faster than secondary metadata.

## Additional design notes

- **Risk callout:** When `past_due` count > 0, show a compact banner above the table: "X subscriptions are past due and retrying payment." Clicking it activates the "Past due" status chip filter.
- **Default sort:** `past_due` subscriptions sort first, then `active` sorted by `next_billing_date ASC` (soonest billing at top). Other statuses sort last.
- **Status filter chips:** Mutually exclusive toggles. Clicking the active chip deselects it (returns to all-status view). All chips unselected = show all.
- **"Next billing date" display:** Show relative time when < 7 days out ("in 2 days", "tomorrow"). Show formatted date for > 7 days. Show "—" for cancelled/expired.
