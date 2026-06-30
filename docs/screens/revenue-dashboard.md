# Revenue

## Purpose

Give merchants confidence in what they are earning and what fees SubPilot is taking, without forcing them into exports.

This page should answer two questions very quickly:

- "How much did I actually keep?"
- "Why is that number what it is?"

## Primary actions

- Change time window
- Inspect gross, fee, and net relationships
- Export ledger if supported

## Layout (desktop)

- Header region:
  - Title: "Revenue"
  - Support line: "Track gross collections, fees, and what lands as net revenue."
  - Right-side controls:
    - segmented time window control: 7d / 30d / 90d if supported
    - optional export button
- Top region should not be three equal KPI boxes.
- Use a stronger two-part hierarchy:
  - Left, larger primary insight panel:
    - Net revenue for selected window
    - comparison vs prior period if available
    - one-line explanation of what changed
  - Right, stacked supporting panels:
    - Gross
    - Platform fees
    - Effective fee rate
- Mid-page explanatory band:
  - "How fees work" compact panel
  - basis points + fixed component
  - tooltip or inline explanation for why a fee exists
- Lower region:
  - Chart panel
    - line or area comparison for gross vs net
    - chart only shown when it actually clarifies trend
  - Ledger panel
    - DataTable with invoice number, date, gross, fee, net, status

## Layout (mobile)

- Net revenue summary appears first as the hero panel.
- Gross, fees, and fee-rate cards stack beneath it as supporting context.
- Time window control remains visible near the top and should be thumb-friendly.
- Chart collapses under a toggle only if it improves scan ease; the ledger remains the dependable source of truth.
- Ledger becomes card list with:
  - invoice number + status
  - gross / fee / net values
  - date

## Components

- DataTable
- EmptyState
- Card
- Button
- ToggleGroup or Tabs for time window
- Tooltip
- Recharts

## Data + states

- Loading:
  - skeleton net summary panel
  - skeleton supporting metrics
  - chart placeholder
  - ledger skeleton
- Empty:
  - Title: "No revenue yet"
  - Description: "Publish a plan and complete a checkout to start seeing gross, fees, and net revenue here."
  - CTA: "Create plan" or "View plans"
- Error:
  - inline error panel with retry
  - if chart data fails but ledger succeeds, keep the ledger visible and replace the chart with a smaller error state

## Accessibility + copy

- Currency always displays as NGN via `formatNGN(kobo)`.
- Chart has a table fallback through the ledger and a clear legend.
- Do not use finance jargon without explanation when plain words work better.
- Copy should say "Platform fees" and "Net revenue", not internal accounting language.

## Visual direction

- This page should feel like a financial cockpit, not a dashboard of random stats.
- Net revenue is the dominant visual anchor, because it is the number the merchant emotionally cares about most.
- Supporting metrics should feel quieter and more analytical.
- Use the existing tokens to keep the page calm; do not fake importance with loud gradients or oversized numbers everywhere.
- The ledger should look dependable and audit-friendly, while the chart stays secondary.

## Additional design notes

- **"How fees work" panel copy:** "SubPilot charges 1.5% + ₦100 per successful payment. Fees are deducted from gross before net is calculated." Show in a compact `bg-muted rounded p-3` info box. Tooltip on "1.5%" explains it is 150 basis points.
- **Chart spec:** Area chart (Recharts `AreaChart`). X-axis = date (daily ticks). Y-axis = NGN amounts formatted via `formatNGN()`. Two series: Gross (`fill="var(--muted)" stroke="var(--muted-foreground)"`), Net (`fill="var(--primary)/20" stroke="var(--primary)"`). Tooltip shows both values on hover.
- **Period comparison:** Show a delta below the main net figure — e.g., "▲ 12% vs previous 30d" in `text-green-600` or "▼ 8%" in `text-destructive`. If backend does not support this, omit rather than fake it.
- **Ledger sort:** `created_at DESC`. Paid rows: normal weight. Void rows: all text `text-muted-foreground`. Open/failed rows: normal with StatusBadge — they do not need special row backgrounds here since the status badge carries the signal.
