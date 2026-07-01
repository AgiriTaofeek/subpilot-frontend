# AGENTS.md — Engineering Standards

Standards for all contributors — human and AI. Writing this for an AI collaborator forces the rules to be explicit. A new human engineer reading this should learn the same things.

---

## The most important rule

**Write the doc before the code.** See [DOCUMENTATION.md](../DOCUMENTATION.md) and the project's `docs/` folder. Any PR that changes product behaviour without updating the relevant doc does not merge.

---

## Project structure rules

- All route files live in `src/routes/`. Do not create routes elsewhere.
- All reusable components live in `src/components/`. Scope by domain: `ui/`, `layout/`, `status/`, `data/`, `subscription/`, `revenue/`.
- All API calls go through typed modules in `src/lib/api/`. Do not call Axios directly from components or route files. Import from the API module for that domain.
- All TypeScript types that mirror backend DTOs live in `src/types/`. Do not inline response types in API modules.
- Constants (event catalogue, billing interval labels, etc.) live in `src/lib/constants/`. Do not hardcode display strings in components.

---

## Monetary handling — never violate these

- All amounts from the backend are **kobo** (integer). Display requires `formatNGN(kobo)` from `src/lib/utils/currency.ts`.
- The `AmountInput` component (for forms) accepts NGN from the user and converts to kobo before submission.
- `formatNGN` is the only conversion point. If you add `/ 100` or `* 100` anywhere else, it is a bug.
- Never display the raw integer to the user.

---

## Component rules

- shadcn/ui components are in `src/components/ui/`. They are copied in, not imported from `node_modules`. Modify them freely. Add new ones with `pnpm dlx shadcn@latest add <component>`.
- `StatusBadge` is the single component for rendering subscription, invoice, plan, and payment statuses. Do not create inline badge elements that duplicate its logic. See [docs/event-taxonomy.md](docs/event-taxonomy.md) for the colour map.
- `DataTable` wraps TanStack Table. Use it for all list views. Do not build ad-hoc table markup.
- `EmptyState` is used when a list is empty. It takes a title, description, and optional CTA.

---

## Data fetching rules

- All server data goes through TanStack Query. Do not fetch in `useEffect`.
- Query keys follow `[resource, ...params]`. See [docs/architecture.md](docs/architecture.md) for examples.
- Mutations must invalidate the relevant list and detail query keys on success.
- Use `useSuspenseQuery` for data that is required to render the page. Use `useQuery` for secondary or optional data.

---

## Form rules

- All forms use TanStack Form (`@tanstack/react-form`) + Zod for schema validation.
- Zod schemas live alongside the form component, not in `src/types/`.
- Submit handlers must convert NGN to kobo before calling the API module.
- Surface backend validation errors using the `message` field from error responses. Do not show raw status codes to users.

---

## Authentication rules

- No client-side auth store exists yet. Do not read `localStorage` directly for auth state once a real mechanism is built — this section will be updated when auth is wired to a real backend.
- The route guard lives in `src/routes/(dashboard)/_layout.tsx` `beforeLoad`. Do not add auth checks elsewhere.
- Portal routes (`src/routes/portal/`) have no auth guard. The subscription token comes from the route param.
- Never import dashboard API modules (`plans.ts`, `subscriptions.ts`, etc.) in portal route files. Portal routes use `portal.ts` only.

---

## Testing expectations

- Unit test pure utility functions: `formatNGN`, `ProrationPolicy` labels, billing interval formatters, state machine display helpers.
- Integration test API modules: mock Axios at the network layer (MSW), not at the module level.
- Do not test component rendering in isolation unless the component has non-trivial logic.
- Test files live next to the files they test (`currency.ts` → `currency.test.ts`).

---

## What NOT to do

- Do not use `any`. Use `unknown` and narrow it, or derive the proper type.
- Do not use `as` casts except when parsing raw JSON (e.g., `JSON.parse(event.payload) as SomeType`).
- Do not add comments that describe what code does — well-named functions do that. Only comment the _why_ when it is non-obvious.
- Do not create a new Axios instance. Use the one exported from `src/lib/api/client.ts` via the domain API modules.
- Do not add features not in the current milestone. If a feature is blocked by a backend gap, note it with a `TODO(blocked): <reason>` comment and link to BACKEND-GAPS.md.
- Do not add a "Refund" action button until the backend exposes the refund endpoint. See [../BACKEND-GAPS.md](../BACKEND-GAPS.md) — Gap 1.
- Do not add a "Request Payout" feature until the backend implements the Transfers disbursement flow. See BACKEND-GAPS.md — Gap 2.

---

## Before considering work done

- Does the change alter product behaviour, UI layout, API shape, auth, or data format?
- If yes: update the relevant doc in the same PR.
- Run `pnpm typecheck` — zero TypeScript errors.
- Run `pnpm lint` — zero ESLint errors.
- Verify in the browser that the golden path for the changed feature works end-to-end.
- A behaviour change with no doc update is an incomplete PR.

---

## Doc update map

| What you changed                | Doc to update                                                                |
| ------------------------------- | ---------------------------------------------------------------------------- |
| New screen or route             | `docs/roadmap.md` (milestone checklist), `docs/architecture.md` (route tree) |
| New API field or response shape | `docs/data-modeling.md`                                                      |
| New status value or badge       | `docs/event-taxonomy.md`                                                     |
| New webhook event               | `docs/event-taxonomy.md` + `src/lib/constants/webhookEvents.ts`              |
| New auth surface or token type  | `docs/auth-model.md`                                                         |
| New domain concept              | `docs/glossary.md`                                                           |
| New end-to-end flow             | `docs/how-it-works.md`                                                       |
| Milestone complete              | `docs/roadmap.md` (check items), write `docs/milestone-N/README.md`          |
| Unblocked backend gap           | Remove or update the relevant section in `../BACKEND-GAPS.md`                |
