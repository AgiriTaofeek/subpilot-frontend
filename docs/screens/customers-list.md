# Customers (List)

## Purpose

Let the merchant search for subscribers, see their payment method summary, and drill into a customer record for troubleshooting.

## Primary actions

- Search customer
- View customer detail

## Layout (desktop)

- Header: “Customers”
- Search: name/email/phone
- DataTable columns:
  - Name
  - Email
  - Phone
  - Card (brand + last4)
  - Subscriptions count
  - Created at
  - Actions (View)

## Layout (mobile)

- Search input full width.
- Cards show:
  - Name + email
  - Card summary
  - Subscriptions count

## Components

- DataTable, Input, EmptyState

## Data + states

- Loading: skeleton table/cards.
- Empty: “No customers yet” with explanation tied to checkout.
- Error: inline error + retry.

## Visual direction

- This page should feel human-centered, not purely tabular.
- Name and contact identity should scan faster than metadata like created date.
- Payment method summary should stay present but visually quieter than the customer identity.

## Additional design notes

- **Card brand display:** Show a small text label (Visa / Mastercard / Verve) from the `card_brand` field alongside `•••• {last4}`. Not just `last4`. Brand icons (SVG) are a v2 addition — text labels are sufficient in v1.
- **Subscription health summary:** In the "Subscriptions" column, show colored counts via StatusBadge — e.g., "1 active" in green or "1 past due" in amber. Do not use freeform text.
- **Default sort:** Most recently active subscription `updated_at DESC`. Customers with no subscriptions sort last.
- **Empty state copy:** "No customers yet. Customers are created automatically when a subscriber completes checkout."
- **No edit capability in v1.** Customer records are read-only. Do not add an edit button or inline edit.
