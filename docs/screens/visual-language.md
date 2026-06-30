# Visual Language

This document turns the existing design system in `src/styles.css` into product-level rules for the screen specs.

It does **not** replace the shadcn preset.

It tells the implementer how to use the existing tokens so SubPilot feels like one considered product instead of a starter kit with nice colors.

---

## Core Feel

SubPilot should feel:

- operational, not playful
- premium, not luxurious
- calm, not sterile
- technical, not developer-only
- trustworthy, not over-marketed

The current tokens already point to this:

- shadcn semantic colors built around `background`, `foreground`, `card`, `muted`, `border`, and `ring`
- restrained contrast instead of a loud custom brand palette
- compact radius values instead of oversized softness
- Oxanium for primary reading rhythm
- Geist Mono for sparing technical emphasis

The screen plan should lean into that.

---

## Visual Principles

### 1. Composition first

Every major screen needs one dominant visual anchor.

Examples:

- marketing home: product preview composition
- dashboard overview: primary health insight
- checkout: price + plan identity + submit action
- portal: status + next billing + safe actions

If a screen is just “some cards in a grid”, it is under-designed.

### 2. Calm surfaces, sharp hierarchy

The token set is now more neutral and semantic. That means hierarchy has to come from:

- typography scale
- spacing
- grouping
- contrast
- alignment

Not from random accent colors, novelty gradients, or heavy borders.

### 3. Cards must earn their existence

Do not default to:

- 3-across feature cards
- dashboard mosaics
- card inside card inside card

Use a card only when it creates a real container:

- form
- summary block
- detail panel
- warning state
- key reveal modal

### 4. One loud thing per screen

Each screen gets one primary moment.

Examples:

- marketing: hero preview
- auth: form heading and path to action
- plans create: live commercial summary
- subscription detail: current state + next risk/action
- API keys: shown-once reveal

Everything else should support that moment.

### 5. Premium means restrained

Premium here does not mean:

- giant glow
- giant shadows
- oversized radius
- loud gradients everywhere

Premium means:

- disciplined spacing
- believable data
- quiet motion
- crisp type
- zero sloppy states

---

## Typography Rules

Use the existing type system already defined in `src/styles.css`.

### Oxanium

Use for:

- primary application text
- dashboard labels
- body copy
- form text

### Geist Mono

Use sparingly for:

- overlines
- technical labels
- event ids, prefixes, code-like metadata
- small trust cues like `Built on Nomba`

Do **not** make the whole app mono-headed. That would feel gimmicky fast.

### Type hierarchy

Each screen spec should imply:

- one page title
- one page support line if needed
- one section heading level
- one metadata style

Avoid equal-weight headings stacked down a page.

---

## Color Usage

Do not invent new brand colors in screen implementation.

Use the existing token family:

- `--background` and `--foreground` for the main light/dark foundation
- `--card` and `--card-foreground` for contained surfaces
- `--muted` and `--muted-foreground` for secondary information
- `--border` and `--ring` for restraint, structure, and focus treatment
- `--primary` and `--primary-foreground` for the main CTA or strongest emphasis
- `--secondary` and `--accent` for lighter supporting emphasis, not visual noise
- `--destructive` only for real destructive states
- `--sidebar-*` only for app-shell navigation work, not for ad hoc page accents

### Accent rule

Accent is for:

- one primary CTA
- one active nav marker
- one key state signal

Not for every component on the screen.

---

## Surface Rules

The existing CSS now reads closer to a disciplined semantic shadcn system than a custom art-directed palette.

That means:

- marketing can still use more breathing room and composition, but should earn atmosphere through layout and scale rather than decorative color treatment
- dashboard should use stronger containers and denser structure
- checkout and portal should use the cleanest, simplest surfaces in the system

### Marketing

- broader sections
- fewer but larger compositions
- quieter backgrounds
- product-preview-led

### Dashboard

- stronger information density
- flatter visual hierarchy than marketing
- minimal decorative treatment
- emphasis on clarity and actionability

### Checkout and Portal

- smallest chrome
- highest readability
- strongest trust copy
- least visual noise

---

## Motion Rules

Motion should feel engineered, not theatrical.

Allowed:

- subtle entrance fade/translate
- sticky-header state shift
- tab or segmented preview swap
- tooltip and popover transitions
- hover clarity on clickable surfaces

Avoid:

- bounce
- large parallax
- floating decorative blobs
- attention-seeking motion on operational screens

If motion does not improve hierarchy or confidence, remove it.

---

## AI Slop Guardrails

The following patterns are banned unless a specific screen spec justifies them:

- centered-everything hero with abstract blob art
- generic 3-column feature grid as the main explanation device
- icon-in-circle repeated six times
- dashboard as equal-weight card mosaic
- giant rounded pills everywhere
- decorative gradients used to mask weak hierarchy

If a screen can be described as “standard SaaS landing page” or “admin dashboard template”, it is not specific enough yet.

---

## Screen-Specific Design Intents

### Marketing home

- should feel like a poster for a real operational product
- the dashboard preview is the hero, not decoration
- “why this exists” should feel sharper than a feature list

### Auth

- should feel fast, credible, and uncluttered
- not too cold
- not a miniature version of the dashboard

### Dashboard overview

- should answer “Are things healthy?” in under 5 seconds
- one hero insight, then supporting metrics
- avoid four equal KPI boxes with no story

### Plans create

- should make pricing feel concrete and commercial
- live summary matters as much as the form

### Public checkout

- should lower anxiety
- plan identity, merchant identity, and payment next-step must be immediately clear

### Portal

- should feel safe and respectful
- subscriber should never wonder whether an action is reversible or immediate

---

## Non-Negotiables

The screen plan is not design-complete unless it defines:

- the dominant visual anchor on each major screen
- what gets emphasis first, second, third
- how mobile preserves that hierarchy
- where the existing semantic color and type tokens are used with restraint
- how trust is conveyed on auth, checkout, portal, and API key flows

That is the bar.
