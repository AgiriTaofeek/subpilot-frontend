# Invoices (List)

## Purpose

Give the merchant a searchable, filterable list of invoices with clear status and money display (NGN) for reconciliation.

## Primary actions

- Filter by status
- View invoice detail

## Layout (desktop)

- Header: “Invoices”
- Filters:
  - Status chips (Paid, Open, Void, Failed if applicable)
  - Search by invoice number or customer email
- DataTable columns:
  - Invoice number
  - Customer
  - Subscription
  - Status (StatusBadge)
  - Gross (NGN)
  - Fee (NGN)
  - Net (NGN)
  - Created at
  - Actions (View)

## Layout (mobile)

- Filters in a sheet.
- Cards show:
  - Invoice number + status
  - Amount
  - Customer
  - Date

## Components

- DataTable, StatusBadge, EmptyState, Input, Sheet

## Data + states

- Loading: skeleton table/cards.
- Empty: “No invoices yet” with explanation that invoices appear after checkout and renewals.
- Error: inline error + retry.

## Visual direction

- This page should feel audit-friendly and calm.
- Amounts and statuses should scan first, while IDs and dates support them.
- Avoid making every row feel equally loud; failed or open invoices can carry slightly more visual emphasis than paid rows.

## Additional design notes

- **Default sort:** `created_at DESC` — newest invoices first.
- **Summary strip:** When a status filter is active, show a one-line summary above the table: "₦X total gross · N invoices". Updates reactively on filter change. Hidden when no filter is active.
- **Failed invoice row treatment:** `bg-destructive/5 border-l-2 border-destructive/30` — slightly warmer without being alarming. Do not use full `bg-destructive` row coloring.
- **Open invoice age indicator:** If an `open` invoice is older than 7 days, show a secondary label "overdue" in `text-muted-foreground text-xs` next to the StatusBadge.
- **Void row treatment:** `text-muted` on all text in the row to convey inactivity without deleting the record.
