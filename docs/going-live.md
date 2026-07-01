# SubPilot — Real Backend Wiring, CI, and Deployment Plan

## Context

The frontend (26 screens: dashboard, portal, marketing) is fully built but runs entirely on static in-memory mock arrays in `src/data/*.ts` — zero real network calls exist anywhere. Separately, the repo already contains a very detailed docs set (`AGENTS.md`, `docs/roadmap.md`, `docs/frontend-build-order.md`, `docs/backend-contract-matrix.md`, `docs/hackathon-brief.md`) written for a different stack (React Hook Form, Axios, Zustand, `src/lib/backend/`, `src/types/`) and a different build order (a minimal "tracer bullet" loop first, with portal/invoices/customers/revenue/webhooks/events explicitly marked out of scope for the first pass). None of that was followed — all 26 screens got built at once, against mock data, on TanStack Form instead of React Hook Form.

Two more things surfaced during planning that needed the user's direct call, since I could not respectably guess either:

1. **Auth model contradiction**: `docs/backend-contract-matrix.md` describes JWT-in-response-body auth; `docs/roadmap.md` and `docs/frontend-build-order.md` explicitly mandate backend-owned HttpOnly cookies and forbid browser-managed JWT for merchant routes. **Resolved: cookie-based is correct** — `backend-contract-matrix.md`'s auth section is the outdated one and needs correcting.
2. **Stack reconciliation**: keep the already-built TanStack Form + mock-data-shaped screens, or rebuild onto the documented React Hook Form/Axios/Zustand stack. **Resolved: keep the current stack** — rewrite the docs to match reality instead of rewriting 26 screens.

Also confirmed: a real backend exists and is deployed somewhere reachable (per `docs/backend-contract-matrix.md`'s "Ready" statuses), and there is an **active hackathon deadline soon**. That last fact reorders everything below — a live, demoable deployment and a real (not mocked) tracer-bullet loop matter more right now than branch-strategy ceremony.

The goal of this plan: get a real backend loop working and a live deployment up, in the order that minimizes risk of a bad demo day, without doing unnecessary process work that a hackathon timeline doesn't reward.

---

## Sequencing rationale (why this order, not "endpoints first" or "infra first" cleanly)

Given the deadline, treat this as three tracks, done in this priority order:

1. **Get something live today** (cheap, de-risks "we've never deployed" surprises) — before touching backend wiring.
2. **Make the core loop real** (auth → plans → checkout → subscriptions) — this is what's actually judged; everything else can stay on mock data for the demo if time runs out.
3. **Branch/CI maturity** (staging branch, branch protection, Dependabot) — explicitly deferred until after the deadline. A single `main` branch with lightweight CI and auto-deploy is enough for now; do not build a three-branch GitFlow-style setup under time pressure only to fight it during the final push.

---

## Phase A — Get a live deployment up (do first, ~1-2 hours)

Even on mock data, ship something to a real URL immediately. This surfaces platform-specific build issues (Workers runtime quirks, env var handling) while there's still time to fix them, instead of discovering them the night before judging.

Per TanStack Start's own hosting docs, **Cloudflare, Netlify, and Railway are the three official hosting partners** with first-class integration; anything else goes through the generic Nitro adapter. Of the three, **Cloudflare Workers** is the pick for the user's explicit "avoid cold starts" requirement — V8 isolate startup is sub-millisecond, a structurally different (and better) answer than "fast" serverless cold starts elsewhere. Netlify or Railway are reasonable fallbacks only if a future dependency needs full Node APIs the Workers runtime can't provide.

1. **Pin versions** — add `"packageManager": "pnpm@<version>"` to `package.json` (match the version in `pnpm-lock.yaml`) and a root `.nvmrc`. Five minutes, prevents CI/deploy environment drift.
2. **Install the official Cloudflare adapter** (not a bare Nitro preset string): `pnpm add -D @cloudflare/vite-plugin wrangler`.
3. **Add the Cloudflare Vite plugin** to `vite.config.ts`'s `plugins` array: `cloudflare({ viteEnvironment: { name: 'ssr' } })`, alongside the existing `tanstackStart()`/`viteReact()`/etc. **Verify at implementation time** whether the existing `nitro({ rollupConfig: { external: [/^@sentry\//] } })` plugin call needs to stay, change, or be removed once `cloudflare()` is added — the official docs' Cloudflare example doesn't show an explicit `nitro()` call alongside it, so this needs a real build-and-check rather than an assumption. Preserve the Sentry rollup externalization if `nitro()` stays (see Phase D note on resolving whether Sentry is actually wanted).
4. **Add `wrangler.jsonc`** at the repo root:
   ```jsonc
   {
     "$schema": "node_modules/wrangler/config-schema.json",
     "name": "subpilot-web",
     "compatibility_date": "<today's date, YYYY-MM-DD>",
     "compatibility_flags": ["nodejs_compat"],
     "main": "@tanstack/react-start/server-entry",
   }
   ```
5. **Update `package.json` scripts**: add `"deploy": "pnpm build && wrangler deploy"` and `"cf-typegen": "wrangler types"`. (There's currently no `start` script to remove.)
6. **Authenticate**: `pnpm dlx wrangler login` locally once. For CI later (Phase C), generate a Cloudflare API token instead and store it as a `CLOUDFLARE_API_TOKEN` GitHub Actions secret.
7. **First deploy manually** — `pnpm run deploy` — to verify the existing mock-data build actually works live end-to-end before wiring any CI/CD automation around it. This is the checkpoint: a live URL exists, however unfinished the backend wiring still is.

### Environment variables (per TanStack Start's official guidance — read this before Phase B)

- **Client-safe values** (e.g. `VITE_API_BASE_URL`) use the `VITE_` prefix and are read via `import.meta.env.VITE_API_BASE_URL` in client components. Add a `.env.example` at the repo root with `VITE_API_BASE_URL=` (empty) so the variable name is documented and committed, without committing a real value.
- **Server-only secrets** (if any get introduced — e.g. a session-signing key used only inside a server function) use no prefix and are read via `process.env.X`, and only from inside `createServerFn().handler()` or middleware `.server()` callbacks.
- **Critical Cloudflare Workers rule, easy to get wrong**: env vars are injected at request time on Workers, not at startup. A module-level `const base = process.env.SOMETHING` will silently evaluate to `undefined` even in server code — it must be read _inside_ a per-request callback (`.handler()`, `.server()` middleware, a route loader). This applies directly to whatever the Phase B backend client module ends up looking like: no module-scope env reads.
- **Where production values actually live**: Cloudflare Workers doesn't read a deployed `.env.production` file at runtime the way a Node server would. Non-secret runtime vars go in `wrangler.jsonc`'s `vars` field; real secrets go via `wrangler secret put <NAME>` (or the Cloudflare dashboard). Reserve `.env`/`.env.local` for local development only — `.gitignore` already excludes `.env` and (via its `*.local` glob) `.env.local`, so no gitignore change is needed.
- Add `src/env.d.ts` declaring `ImportMetaEnv` for `VITE_API_BASE_URL` so `import.meta.env.VITE_API_BASE_URL` is typed instead of `any`.
- If runtime validation via Zod is wanted later, wrap the parse in a function called per-request (e.g. `getServerEnv()`) rather than parsing at module load — same per-request rule as above.

## Phase B — Wire the real tracer-bullet loop

This is the part that's actually judged (state-machine completeness, dunning, multi-tenant cleanliness, API ergonomics all need to be backed by something real, not just visually present). Keep the existing screens; swap their data source underneath them, one domain at a time, in this order (matches `docs/frontend-build-order.md`'s sequencing logic, which holds regardless of which HTTP/form stack is used — auth has to come first because everything downstream needs merchant identity):

Current implementation status:

- signup/login submissions are now wired through TanStack Start server functions and the dashboard sidebar logout action is real
- dashboard bootstrap, auth-route redirect guards, CSRF header forwarding, and 401 -> refresh -> retry are now wired through the real backend session contract
- plans create/list/detail/publish/archive are now wired to the real backend
- public hosted checkout now loads the real public plan contract and redirects to the backend-provided Nomba checkout URL
- the subscriptions list now uses real backend data, aggregated with customer and plan data on the Start side; the richer subscription detail view remains outside the tracer-bullet scope

1. **Auth (signup/login/me/logout), cookie-based.** Cookie-setting requires a server boundary — client components cannot set `HttpOnly` cookies directly. Add TanStack Start server functions (`createServerFn`) for `POST /v1/auth/signup`, `POST /v1/auth/login`, `POST /v1/auth/logout`, and a loader/`beforeLoad`-driven `GET /v1/auth/me` bootstrap on the `_dashboard` pathless layout (`src/routes/_dashboard.tsx`) to gate dashboard routes server-side, forwarding the backend's `Set-Cookie` back to the browser. Replace `login.tsx`/`signup.tsx`'s `setTimeout(...reject("Backend not yet connected."))` stubs with real calls to these server functions, keeping the existing TanStack Form usage as-is — only the `onSubmit` body changes.
2. **Plans**: create + publish, replacing the mock array push in `src/data/plans.ts` with real `GET/POST /v1/plans`, `POST /v1/plans/:id/publish` calls via TanStack Query (`useMutation`/`useQuery`), reusing `plans/new.tsx` and `plans/$planId.tsx` as-is.
3. **Public checkout**: `GET /v1/public/plans/:merchantSlug/:planSlug` and `POST /v1/public/plans/:merchantSlug/:planSlug/checkout`, replacing `resolvePublicPlan` in `src/data/plans.ts` and wiring the real Nomba redirect in `pay.$merchantSlug.$planSlug.tsx`.
4. **Subscriptions list**: `GET /v1/subscriptions`, replacing the mock array in `src/data/subscriptions.ts`, confirming a subscription that activates via real webhook actually shows up in `/subscriptions` within the UI.

Everything else (invoices, customers, revenue, webhooks, events, portal, API keys) stays on mock data for now — per the original build-order doc's own judgment, and reinforced by the deadline: those screens already visually demonstrate the judging criteria; only the core loop needs to be provably real.

**Data module convention**: keep `src/data/*.ts` as the module location (no new `src/lib/backend/`/`src/types/` split) — migrate each file in place from a static array export to real fetchers, so screens importing from `#/data/plans.ts` etc. don't need import-path churn. Use TanStack Query (already a dependency, already wired into router context in `__root.tsx`) for client-side fetching/caching; do not add Axios — a small typed `fetch` wrapper is enough and avoids an unnecessary dependency the "keep current stack" decision already ruled against in spirit.

## Phase C — Lightweight CI (do alongside Phase B, not before)

Given the deadline, skip the three-branch model for now. Single `main`. Unlike Cloudflare Pages, Workers deployment via Wrangler is not git-triggered automatically — it needs an explicit `wrangler deploy` step, so this phase has two workflow files instead of one:

Current implementation status:

- `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` now exist
- `formatNGN` and auth backend-request coverage now exist under Vitest + MSW
- the CI lint step currently uses `pnpm check:ci` instead of repo-wide `pnpm check`, because there is still pre-existing Biome debt in shared UI primitives and editor config files that sits outside the hackathon-critical tracer-bullet slice
- repo-wide Biome cleanup remains deferred to the post-deadline docs/tooling reconciliation pass

- **`.github/workflows/ci.yml`** — triggers on `push` and `pull_request` to `main`. Steps: checkout, `pnpm/action-setup`, `actions/setup-node` with `node-version-file: .nvmrc` and `cache: pnpm`, `pnpm install --frozen-lockfile`, `pnpm check:ci` (Biome on active app/config surfaces), `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **`.github/workflows/deploy.yml`** — triggers on `push` to `main` (after `ci.yml` passes, or as a second job gated on the first). Same setup steps, then `pnpm build` followed by `wrangler deploy` via `cloudflare/wrangler-action@v3`, authenticated with the `CLOUDFLARE_API_TOKEN` secret created in Phase A step 6.
- Add exactly two tests alongside the Phase B auth work (not more, not a full suite — deadline-appropriate): one for `formatNGN` (the single most bug-prone conversion point per `AGENTS.md`'s own monetary-handling rule) and one integration test for the auth server function (signup success + backend error message surfaced), using MSW (already listed as a Phase 0 dependency in the docs and worth keeping regardless of the stack decision, since it's the standard way to test server functions without hitting the real backend in CI).
- Skip PR preview deployments for now — Workers/Wrangler doesn't give the same zero-config preview URL as Pages. Wrangler does support a "versions" preview-URL feature; revisit as a Phase D nice-to-have, not before the deadline.

## Phase D — Defer until after the deadline

Do not start these before submitting; list them so nothing is silently forgotten:

1. **Branch strategy maturity**: add a `staging` branch, branch protection rules on `main` (require the CI check, require up-to-date branches, disallow force-push), and a second Worker (e.g. a separate `wrangler.jsonc` environment) for staging, once there's slack to maintain the extra promotion step.
2. **Docs reconciliation** — rewrite `AGENTS.md`, `docs/roadmap.md`, and `docs/frontend-build-order.md` to describe the stack actually in use (TanStack Form not React Hook Form; TanStack Query + fetch, not Axios; `src/data/` not `src/lib/backend/`; `_dashboard` flat routes not `(dashboard)` grouping) and fix `docs/backend-contract-matrix.md`'s auth section from JWT to cookie-based. Do this once the dust settles — it's bookkeeping, not judging-relevant.
3. **Sentry**: `vite.config.ts` already excludes `/^@sentry\//` from the Nitro rollup bundle, but no `@sentry/*` package is installed and Sentry is never mentioned in `docs/`. Resolve as a yes/no: either remove the exclusion (dead boilerplate) or actually install `@sentry/tanstackstart-react` for error monitoring. Not urgent before the deadline; worth 10 minutes of cleanup after.
4. **Dependency automation**: `.github/dependabot.yml` (weekly, npm + github-actions ecosystems).
5. **`nitro-nightly@latest` risk**: currently pinned to a prerelease `@latest` tag with no changelog discipline — pin to an exact nightly version once the Cloudflare build is verified working, so a future `pnpm install` can't silently change build behavior right before a demo.
6. **Security headers / CSP**: `/pay/:merchantSlug/:planSlug` and `/portal/:token` are unauthenticated, externally-linked, natural phishing targets for a billing product — add via response headers set in the TanStack Start server entry, or Workers-level config, post-deadline.
7. **Webhook signature verification guidance**: if any server function ever touches the inbound Nomba webhook path, use Web Crypto (`SubtleCrypto`), not Node's `crypto` module, since the deploy target is the Cloudflare Workers runtime.
8. **Rollback documentation**: `wrangler rollback` reverts to the previous deployed Worker version — write the exact command and any manual steps into `docs/deployment.md` before an incident forces figuring it out live.

---

## Verification

- **Phase A checkpoint**: visit the live `*.workers.dev` (or custom domain) URL after `pnpm run deploy`, confirm the marketing homepage and at least one dashboard screen render correctly against the production build (not just `pnpm dev`), and confirm `import.meta.env.VITE_API_BASE_URL` resolves correctly at runtime (not `undefined`).
- **Phase B checkpoint (the actual demo-readiness gate)**: from a clean browser session, sign up a new merchant → land in `/overview` with a real cookie session → create and publish a plan → open the hosted checkout link → complete checkout → confirm the subscription appears in `/subscriptions` after the real webhook fires. This is the same tracer-bullet success criterion `docs/frontend-build-order.md` already defines — it just now runs against the kept stack instead of the originally planned one.
- **Phase C checkpoint**: open a PR touching any file, confirm `ci.yml` runs and reports lint/typecheck/build/test status; merge to `main` and confirm `deploy.yml` runs `wrangler deploy` successfully and the live URL reflects the change.
