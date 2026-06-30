# Plans (List)

## Purpose

Let the merchant browse, filter, and create subscription plans, and quickly copy the hosted checkout URL for published plans.

## Primary actions

- Create plan
- Publish plan (from list if supported, otherwise from detail)
- Copy checkout URL (published plans)

## Layout (desktop)

- Page header:
  - Title: “Plans”
  - Primary button: “Create plan”
- Filter row:
  - Status filter chips: Draft / Published / Archived
  - Search input: plan name
- DataTable columns:
  - Name
  - Price (NGN)
  - Interval (monthly/annual/custom)
  - Trial (days)
  - Status (StatusBadge)
  - Hosted URL (published only, copy button)
  - Actions (View, Publish, Archive)

## Layout (mobile)

- Header with “Create plan” button.
- Filters:
  - Status chips scroll horizontally.
  - Search input full width.
- List becomes cards:
  - Top row: name + status badge
  - Second row: price + interval
  - Third row: hosted URL copy button (published only)
  - Tap card → plan detail

## Components

- DataTable, StatusBadge, EmptyState, Button, Input, Tabs/Toggle group for filters, DropdownMenu for row actions

## Data + states

- Loading: table skeleton or card skeleton list.
- Empty:
  - Title: “No plans yet”
  - Description: “Create a plan to generate a checkout link you can share with customers.”
  - CTA: “Create plan”
- Error: inline error panel + retry.

## Validation + errors

- Copy URL: toast “Checkout link copied”.

## Visual direction

- This page should feel like a catalogue of commercial offers, not a back-office spreadsheet.
- Published plans should feel easier to scan and share than drafts.
- The "Create plan" action should read as momentum, while row actions stay quieter.

## Additional design notes

- **Default sort:** `created_at DESC`. When no status filter is active, published plans sort above drafts of the same age.
- **Row click behavior:** The entire row navigates to plan detail. The "Copy link" button uses `e.stopPropagation()` so clicking it does not navigate.
- **Copy URL feedback:** Toast "Checkout link copied" at bottom-right, 2s duration, then auto-dismiss.
- **No bulk actions in v1.** State this explicitly if asked. Archive and publish are single-row actions only.
- **Empty state for "Archived" filter:** Title "No archived plans", no CTA. This is an intentional dead-end — do not offer a "Create plan" path from this filtered view.
- **Status chips behavior:** Chips act as mutually exclusive toggles. Selecting an active chip deselects it (returns to all-status view).
