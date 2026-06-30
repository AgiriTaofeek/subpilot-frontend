# Customer (Detail)

## Purpose

Show who the subscriber is, what card is on file, and all subscriptions/invoices linked to them.

## Primary actions

- View linked subscriptions
- View invoices

## Layout (desktop)

- Header:
  - Customer name
  - Secondary text: email, phone
- Body should use a clear hierarchy:
  - Top identity region:
    - customer name
    - secondary text: email, phone
  - Right-side trust panel:
    - "Payment method"
    - brand, last4, expiry if available
  - Lower operational region:
    - subscriptions list first
    - invoices list second
- Subscriptions list:
  - DataTable of subscriptions linked to this customer
  - columns: status, plan, next billing date, amount
- Invoices list:
  - recent invoices linked to this customer
  - show this as secondary context, not equal priority with subscriptions

## Layout (mobile)

- Customer identity card at top.
- Payment method appears immediately after identity so support or ops users can confirm it quickly.
- Subscriptions and invoices become card lists with "View" links.

## Components

- Card, DataTable, StatusBadge

## Data + states

- Loading: skeleton cards and lists.
- Error: inline error + retry.

## Visual direction

- This page should feel like a calm customer dossier.
- Identity and payment method should be quickly legible, but the subscriptions area remains the primary working surface.
- Avoid turning this into a wall of boxes. Group related facts into a few purposeful regions.

## Additional design notes

- **Header layout:** Two-column. Left: identity card (name in `text-xl font-bold`, email in `text-muted-foreground`, phone if present). Right: payment method card (brand text label + `•••• {last4}` + expiry formatted as "Exp. 09/28").
- **At-risk indicator:** If any linked subscription is `past_due`, show an amber StatusBadge "1 past due" in the header region. Clicking it scrolls to or filters the subscription list below.
- **Subscriptions table columns:** Plan · Status (StatusBadge) · Next billing date · Amount (NGN) · Actions (View).
- **Invoices table:** Show last 5 only. Columns: Invoice number (Geist Mono) · Date · Amount · Status. "View all invoices" link below the table routes to `/invoices?customerId={id}`.
- **Read-only in v1:** No edit capability on customer records. Do not add an edit button or inline field editing.
