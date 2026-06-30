# Overview

## Purpose

Give the merchant a fast “health read” of their subscription business and a clear next action when they are new (create a plan).

## Primary actions

- Create plan (primary CTA when no plans exist)
- View subscriptions
- View revenue

## Layout (desktop)

- Top region should not be four equal-weight KPI boxes with no story.
- Use a two-part hierarchy:
  - Left, larger primary insight panel:
    - “Subscription health”
    - Active subscriptions
    - one trend/comparison
    - one sentence of interpretation if data supports it
  - Right, smaller stacked supporting metrics:
    - Past due count
    - Net last 30 days
    - MRR or gross last 30 days
- Middle row:
  - Left: “Recent activity” feed
  - Right: “At risk” subscriptions panel with stronger warning treatment when non-empty
- Bottom:
  - compact recent subscriptions table (last 10)
  - keep this visually quieter than the health region

## Layout (mobile)

- Health panel appears first.
- Supporting KPIs become a short vertical stack under it.
- “At risk” list becomes a single card with the top 3 items and a “View all” link.
- Recent subscriptions table becomes a card list.

## Components

- Cards, Badge (StatusBadge), DataTable (desktop), EmptyState
- Tabs or segmented control for time window (7d / 30d / 90d) if backend supports.

## Visual direction

- This page should feel like an operations console, not a homepage wearing admin clothes.
- The merchant should know the business condition in under 5 seconds.
- Use one dominant panel and subordinate supporting surfaces.
- If the overview is empty, the create-plan state should feel like a guided first step, not a dead dashboard.

## Data + states

- Loading: show skeleton KPI cards and skeleton list rows.
- Empty: if no plans exist, show EmptyState:
  - Title: “Create your first plan”
  - Description: “Publish a plan to get a checkout link you can share with customers.”
  - CTA: “Create plan”
- Errors: inline error with retry.

## Accessibility + copy

- KPI cards have clear labels and secondary explanation text where needed.
- Avoid jargon in first-time state (“past due” includes a tooltip “payment failed, retrying”).

## App shell (shared across all dashboard screens)

- **Sidebar width:** 240px on `lg+`. Collapsible to icon-only rail (48px) on `md`.
- **Nav items (top to bottom):** Overview · Plans · Subscriptions · Invoices · Customers · Revenue · Webhooks · Events
- **Bottom of sidebar:** User email (truncated) · Logout button
- **Active state:** `bg-accent text-accent-foreground` on the active item. No loud accent stripe.
- **Mobile:** Sidebar replaced by a top-left hamburger → Sheet drawer with the same nav items stacked.

## Additional design notes

- **”Recent activity” feed item format:** `[event_type_label] · [resource_id, truncated to 12 chars] · [relative time]` — e.g., `subscription.activated · sub_01J3… · 3 min ago`
- **Day-0 empty state:** Replace the entire dashboard region with a single centered `EmptyState` card. Do not show a skeleton of the normal dashboard. Title: “Welcome to SubPilot”. Description: “Create a plan to get a hosted checkout link you can share with customers.” CTA: “Create plan”.
- **Health panel interpretation copy:** Use one-sentence summaries — e.g., “All subscriptions current” (green) or “2 subscriptions are past due and retrying” (amber). Do not leave the panel blank when data is present.
- **KPI formatting:** Always `₦482,000` (formatted NGN via `formatNGN()`), never raw integers. Negative deltas shown in `text-destructive`.
