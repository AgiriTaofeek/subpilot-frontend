# Screen Specs

This folder describes how each screen should look and behave. It is UI-first documentation meant to be implemented with the existing shadcn presets and the component rules in `AGENTS.md` (DataTable, EmptyState, StatusBadge, AmountInput, TanStack Query patterns).

For cross-screen rules on loading states, timeout behavior, retries, slow endpoints, and eventual consistency, also follow `docs/frontend-error-and-loading-strategy.md`.
For cross-screen visual rules that preserve the existing tokens and mood in `src/styles.css`, also follow `visual-language.md`.

These specs are intentionally written as target UI. The current codebase is still a TanStack Start starter app, so most routes do not exist yet.

---

## Navigation Map

### Marketing site

- `/` → [marketing-home.md](marketing-home.md)

### Merchant dashboard

- `/auth/login` → [auth-login.md](auth-login.md)
- `/auth/signup` → [auth-signup.md](auth-signup.md)
- `/overview` → [dashboard-overview.md](dashboard-overview.md)
- `/plans` → [plans-list.md](plans-list.md)
- `/plans/new` → [plans-new.md](plans-new.md)
- `/plans/:planId` → [plans-detail.md](plans-detail.md)
- `/subscriptions` → [subscriptions-list.md](subscriptions-list.md)
- `/subscriptions/:subscriptionId` → [subscriptions-detail.md](subscriptions-detail.md)
- `/invoices` → [invoices-list.md](invoices-list.md)
- `/invoices/:invoiceId` → [invoice-detail.md](invoice-detail.md)
- `/customers` → [customers-list.md](customers-list.md)
- `/customers/:customerId` → [customer-detail.md](customer-detail.md)
- `/webhooks` → [webhooks-endpoints.md](webhooks-endpoints.md)
- `/webhooks/deliveries` → [webhooks-deliveries.md](webhooks-deliveries.md)
- `/events` → [events-audit-log.md](events-audit-log.md)
- `/revenue` → [revenue-dashboard.md](revenue-dashboard.md)
- `/settings/api-keys` → [settings-api-keys.md](settings-api-keys.md)
- `/settings/account` → [settings-account.md](settings-account.md)

### Public checkout (unauthenticated)

- `/pay/:merchantSlug/:planSlug` → [public-checkout.md](public-checkout.md)

### Subscriber portal (subscription token)

- `/portal/:token` → [portal-overview.md](portal-overview.md)
- `/portal/:token/invoices` → [portal-invoices.md](portal-invoices.md)
- `/portal/:token/available-plans` → [portal-available-plans.md](portal-available-plans.md)
- `/portal/:token/card-updated` → [portal-card-updated.md](portal-card-updated.md)

---

## Global UI Rules

### Layout

- Marketing pages use a separate shell from the app shell. No dashboard sidebar, no portal chrome.
- The marketing homepage should visually preview the dashboard and portal so a first-time visitor knows what they are buying before they hit auth.
- Desktop dashboard uses an AppShell: sidebar navigation, top bar for page title/actions, content area with consistent max width.
- Mobile dashboard uses a collapsed navigation opened via a top-left menu button (Sheet pattern). Page actions move into a sticky bottom action bar when needed.
- Portal and public checkout use minimal chrome: logo, page title, no dashboard navigation.

### Visual hierarchy

- Every screen needs one dominant visual anchor. If a screen is only a row of equal-weight cards, it is under-designed.
- Dashboard pages should not feel like a starter-template card mosaic. Use larger primary regions and calmer secondary surfaces.
- Marketing should be composition-led, not feature-grid-led.
- Checkout and portal should feel the simplest and most trustworthy surfaces in the product.

### Design system usage

- Do not tamper with the existing token system in `src/styles.css`. Build from it.
- Use the semantic shadcn token family with restraint:
  - `background`, `foreground`, `card`, `muted`, `border`, `ring`, `primary`, `secondary`, `accent`
- Oxanium is the main reading rhythm. Geist Mono is for small technical accents only.
- Cards must earn their existence. No decorative card grids.

### Trust surfaces

- Auth, checkout, portal, revenue, subscription detail, and API key reveal are trust-critical screens and need extra copy clarity.
- Show plausible operational data in previews and examples. Never inflate numbers just to look impressive.
- When a user action is sensitive, cancellation, publish, key creation, card update, the screen should explain what happens next before the user confirms.

### Loading, empty, error states

- Required data: use a full-page skeleton or table skeleton. Never show blank space.
- Empty lists: use EmptyState with a single primary CTA.
- Errors: show an inline error panel with a retry button. Do not push raw status codes to the user.

### Tables

- All list views use DataTable on desktop.
- On mobile, tables collapse into stacked cards with key fields + a “View” affordance.
- Filters live above the table as chips + a “More filters” popover/sheet on mobile.

### Status rendering

- Use StatusBadge for every plan/subscription/invoice/payment status. No bespoke colored pills.
- Every status badge should have a tooltip that explains what it means in plain English.

### Money

- All amounts from backend are integer kobo.
- Display always uses `formatNGN(kobo)` and never manual `/ 100`.
- AmountInput accepts NGN and converts to kobo on submit.

### Responsiveness

- Breakpoints: treat `sm` as phone, `md` as small tablet, `lg+` as desktop.
- Forms: single-column on mobile, two-column only when it reduces scrolling without harming comprehension.
- Place destructive actions behind a confirmation dialog on all screen sizes.
- Mobile should preserve hierarchy, not merely stack desktop blocks.

---

## Screen Spec Template

Each screen file uses this structure:

- Purpose
- Primary actions
- Layout (desktop)
- Layout (mobile)
- Components (shadcn + project components)
- Data + states (loading/empty/error)
- Validation + errors
- Accessibility + copy
