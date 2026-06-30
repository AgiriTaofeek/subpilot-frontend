# Marketing Site (Home)

## Purpose

This is the first thing a new visitor sees at `subpilot.com`. Its job is not to be a brochure. Its job is to make the right merchant immediately understand:

- what SubPilot does
- who it is for
- why it is better than rebuilding subscriptions in-house
- what the dashboard and portal will feel like
- what to do next

For this product, the home page is a trust surface. If it looks vague, generic, or over-marketed, the product feels fake. If it looks clear, concrete, and operational, the product feels real.

## Primary actions

- Get started
- Sign in
- View product walkthrough / see how it works
- Jump to API/webhooks section

## Layout (desktop)

### 1. Header

- Left: wordmark / logo
- Center or right: nav links
  - Product
  - How it works
  - Webhooks
  - Portal
  - Pricing or “Built for Nomba”
- Right-side actions:
  - Secondary: “Sign in”
  - Primary: “Get started”

Header should become slightly translucent/sticky on scroll.

### 2. Hero

- Left column:
  - Headline:
    - “Recurring billing for Nomba, without rebuilding the whole subscriptions stack.”
  - Subhead:
    - Explain in one sentence that SubPilot handles plans, billing cycles, proration, dunning, portal, and webhooks.
  - CTA row:
    - Primary: “Get started”
    - Secondary: “See how it works”
  - Trust strip:
    - “Built on Nomba Checkout + tokenised cards”
    - “Multi-tenant”
    - “Webhook-ready”

- Right column:
  - High-fidelity dashboard preview mockup, not a random abstraction.
  - The preview should show:
    - active subscriptions count
    - a `past_due` item
    - revenue summary
    - recent webhook deliveries

This matters. Buyers of infrastructure products want proof of operational seriousness.

### 3. “Why this exists” section

- Short problem framing:
  - Nomba gives primitives, not the managed subscription layer.
  - Teams keep rebuilding plan logic, retries, dunning, and subscriber self-service.
- Do **not** default to a symmetric 3-card SaaS comparison block.
- Prefer a split narrative band:
  - left: “Without SubPilot” friction stack
  - right: “With SubPilot” operational loop
  - bottom or side note: “What your team gets back”
- This section should feel sharper than a feature list, closer to a product argument.

### 4. Capability section

Show the six hackathon must-haves, but avoid a generic equal-weight icon grid.

Preferred approach:

- 2 or 3 larger capability bands with nested proofs
- or a split layout where each capability is tied to a product preview fragment

The six capabilities are:

- Plan management
- Flexible billing cycles
- Proration
- Dunning + recovery
- Customer portal
- Webhooks + events

Each capability should show:

- one-line outcome
- one operational proof point
- one concrete UI or event artifact

Examples:

- Dunning shows retry timing, not a generic icon
- Webhooks shows delivery logs, not a decorative code block
- Portal shows status/change-plan/update-card actions, not vague “customer control”

### 5. “How it works” section

A horizontal or vertical step flow:

1. Merchant creates and publishes a plan
2. Customer checks out through a hosted page
3. Nomba processes payment and tokenises the card
4. SubPilot activates the subscription and starts recurring billing
5. Webhooks notify downstream systems
6. Customer self-serves in the portal

This section should include a simple diagram, not just text.

### 6. Dashboard + portal showcase

This is where you do what great SaaS products do:

- One section for merchant dashboard
  - Plans
  - Subscriptions
  - Revenue
  - Webhook logs
- One section for subscriber portal
  - status
  - invoices
  - update card
  - change plan

Use tabs or segmented controls to swap preview states. The key is that people can picture themselves using it before signing up.

This section should feel like a curated product walkthrough, not a screenshot gallery.

### 7. Developer/integration section

This is important for your hackathon judging criteria.

Show:

- API key management
- webhook event delivery logs
- event payload preview
- short copy:
  - “Use SubPilot operationally in the dashboard, integrate it programmatically with API keys + webhooks.”

### 8. Trust / proof section

Possible content:

- “Designed for product teams shipping on Nomba”
- “State-machine complete”
- “Built for operational visibility”
- “Portal included”

Even if you do not yet have customers, the page should still communicate engineering seriousness.

### 9. Footer CTA

- Headline:
  - “Stop rebuilding subscriptions.”
- Buttons:
  - “Get started”
  - “Sign in”

## Layout (mobile)

This page must still sell clearly on a phone.

### Mobile rules

- Hero becomes single-column.
- Dashboard preview appears immediately after headline and first CTA.
- Capability grid becomes stacked cards.
- “How it works” becomes a vertical timeline.
- Dashboard and portal previews become swipeable cards or tabs.
- Sticky mobile bottom CTA is acceptable:
  - “Get started”

### Mobile content priority

People should understand these four things within the first 1.5 screens:

1. This is recurring billing for Nomba
2. It handles the hard parts
3. There is both a merchant dashboard and customer portal
4. They can start immediately

## Components

- shadcn Button, Card, Tabs, Badge, Separator
- Hero mockup frame should be a custom marketing component, not a raw screenshot dump
- Responsive section wrappers with consistent spacing

## Visual direction

- Hero should read as one composition, not two unrelated columns.
- The product preview should be the loudest visual object on the page.
- Use the current semantic token system from `src/styles.css`, not a custom blue-purple SaaS palette.
- Avoid icon-in-circle repetition and centered-everything section rhythm.
- If decorative cards are removed, the page should still feel premium because the hierarchy is doing the real work.

## Motion + polish

- Subtle hover elevation on feature cards
- Soft entrance motion on hero mockup
- Sticky header transition on scroll
- Tab transitions for dashboard/portal preview should be quick and quiet

Do not overdo motion. Infrastructure products should feel crisp, not theatrical.

## Content guidance

Avoid generic SaaS copy like:

- “Streamline your business”
- “Unlock growth”
- “Powerful platform”

Prefer specific copy:

- “Publish a plan, share a hosted checkout link, and let SubPilot handle retries, proration, and subscriber self-service.”

## Accessibility + trust

- Hero preview images need alt text
- Contrast must stay high
- CTAs must remain visible without relying on animation
- Realistic preview data should look plausible, not inflated

## Key UX principle

The homepage should do three jobs at once:

- Sell the product
- preview the product
- pre-qualify the user

That means the ideal flow is:

`marketing home` → `get started` → `signup`
`marketing home` → `sign in` → `login`
`marketing home` → `see product` → scroll through dashboard + portal previews
