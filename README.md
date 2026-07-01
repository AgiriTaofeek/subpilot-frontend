# SubPilot Frontend

The merchant dashboard and customer self-service portal for SubPilot, a managed recurring-billing engine built on top of Nomba's payment primitives.

---

## What it is

SubPilot gives product teams a complete subscription layer without rebuilding one from scratch. This frontend exposes that layer to two audiences:

- **Merchants**: configure plans, monitor subscriptions, manage webhooks, review revenue. Accessed through the SubPilot web app, with merchant auth handled by backend-owned `HttpOnly` cookies forwarded through TanStack Start.
- **Subscribers**: manage their own subscription, cancel, change plan, update card. Accessed at `/portal/:token`, no login required, authenticated via an opaque token in the URL.

The backend it talks to lives in `sub-pilot-backend/` (Java/Spring Boot). This repo treats the backend as read-only context for frontend work.

---

## Tech stack

| Layer        | Tool                                    |
| ------------ | --------------------------------------- |
| Framework    | TanStack Start (Vite + TanStack Router) |
| Language     | TypeScript                              |
| UI           | shadcn/ui + Tailwind CSS                |
| Server state | TanStack Query                          |
| Forms        | React Hook Form + Zod                   |
| HTTP         | Axios                                   |
| Charts       | Recharts                                |

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- The SubPilot backend running at `http://localhost:8080` or the configured backend base URL

---

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The app starts at `http://localhost:3000`.

---

## Environment variables

| Variable            | Default                 | Purpose                   |
| ------------------- | ----------------------- | ------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | SubPilot backend base URL |

---

## Project structure

```text
src/
  routes/           TanStack Router file-based routes
    (auth)/         Login and signup
    (dashboard)/    Merchant console, sidebar + topbar layout
    portal/         Customer self-service portal, minimal layout
  components/
    ui/             shadcn/ui primitives
    layout/         AppShell, Sidebar, TopBar, PortalShell
    status/         StatusBadge
    data/           DataTable, Pagination, EmptyState
    subscription/   StateMachineDiagram, DunningTimeline
    revenue/        RevenueChart
  lib/
    backend/        Server-only backend clients per backend controller/domain
    server/         TanStack Start server functions, auth forwarding, CSRF helpers
    utils/          formatNGN, date helpers
  types/            TypeScript interfaces mirroring backend DTOs
docs/               Design docs and execution docs
```

---

## Documentation

| File                                                                                       | Purpose                                                                 |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [docs/prd.md](docs/prd.md)                                                                 | Problem, users, v1 scope, non-goals, success criteria                   |
| [docs/roadmap.md](docs/roadmap.md)                                                         | Milestones with bounded scope                                           |
| [docs/glossary.md](docs/glossary.md)                                                       | Every domain term defined once                                          |
| [docs/architecture.md](docs/architecture.md)                                               | Components, request flow, technology choices                            |
| [docs/frontend-bff-architecture.md](docs/frontend-bff-architecture.md)                     | Recommended TanStack Start BFF boundary and data-flow strategy          |
| [docs/backend-auth-architecture-request.md](docs/backend-auth-architecture-request.md)     | Backend-facing auth/session contract request, backend-owned cookie auth |
| [docs/backend-phase-b-handoff.md](docs/backend-phase-b-handoff.md)                         | Concrete backend changes needed to unblock Phase B frontend wiring      |
| [docs/BACKEND-GAPS.md](docs/BACKEND-GAPS.md)                                               | Tracked backend blockers that still prevent parts of the frontend       |
| [docs/auth-model.md](docs/auth-model.md)                                                   | Merchant cookie auth, portal token auth, and API-key auth surfaces      |
| [docs/frontend-error-and-loading-strategy.md](docs/frontend-error-and-loading-strategy.md) | Loading, timeout, retry, error, and eventual-consistency UX rules       |
| [docs/data-modeling.md](docs/data-modeling.md)                                             | TypeScript types mirroring backend DTOs                                 |
| [docs/hackathon-brief.md](docs/hackathon-brief.md)                                         | Hackathon requirements and judging-criteria mapping                     |

---

## Where to go next

- New to the domain? Start with [docs/glossary.md](docs/glossary.md).
- Understanding the architecture? Read [docs/architecture.md](docs/architecture.md).
- Evaluating the BFF approach? Read [docs/frontend-bff-architecture.md](docs/frontend-bff-architecture.md).
- Sending auth requirements to backend? Read [docs/backend-auth-architecture-request.md](docs/backend-auth-architecture-request.md).
- Sending the exact Phase B backend fixes? Read [docs/backend-phase-b-handoff.md](docs/backend-phase-b-handoff.md).
- Designing loading/error UX? Read [docs/frontend-error-and-loading-strategy.md](docs/frontend-error-and-loading-strategy.md).
- Starting on a feature? Check [docs/roadmap.md](docs/roadmap.md) for current milestone scope.
