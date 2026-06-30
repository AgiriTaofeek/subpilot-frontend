# Backend Contract Matrix

This is the source of truth for what the frontend assumes the backend provides, and which items are blocked.

If a frontend milestone depends on an endpoint that is not ready, it is blocked until this matrix says it is ready.

---

## Legend

| Status | Meaning |
|---|---|
| Ready | Implemented and stable enough to build against |
| Partial | Exists but missing a required behavior/field |
| Blocked | Not implemented or not safe to build against |

---

## Authentication (dashboard JWT)

| Contract | Purpose | Status |
|---|---|---|
| `POST /v1/auth/signup` returns `AuthResponse` including `token` | Signup and auto-login | Ready |
| `POST /v1/auth/login` returns `AuthResponse` including `token` | Login | Ready |
| `POST /v1/auth/logout` | Logout | Blocked |
| `GET /v1/settings/api-keys` | List API keys (prefix, label, last used) | Ready |
| `POST /v1/settings/api-keys` | Create API key (raw key shown once) | Ready |
| `DELETE /v1/settings/api-keys/:id` | Revoke API key | Ready |

---

## Plans (merchant)

| Contract | Purpose | Status |
|---|---|---|
| `GET /v1/plans` | List plans | Ready |
| `POST /v1/plans` | Create plan (kobo amounts) | Ready |
| `GET /v1/plans/:id` | Plan detail | Ready |
| `PATCH /v1/plans/:id` | Update allowed fields | Ready |
| `POST /v1/plans/:id/publish` | Publish plan + generate hosted checkout URL | Ready |
| `POST /v1/plans/:id/archive` | Archive plan | Ready |
| `DELETE /v1/plans/:id` | Delete maps to archive | Ready |

---

## Public checkout (subscriber)

| Contract | Purpose | Status |
|---|---|---|
| `GET /v1/public/plans/:merchantSlug/:planSlug` | Fetch public plan details | Ready |
| `POST /v1/public/plans/:merchantSlug/:planSlug/checkout` | Initiate checkout and return `checkoutUrl` | Ready |

---

## Subscriptions (merchant)

| Contract | Purpose | Status |
|---|---|---|
| `GET /v1/subscriptions` | List subscriptions (supports `status` and `planId`) | Ready |
| `GET /v1/subscriptions/:id` | Subscription detail | Ready |
| `POST /v1/subscriptions/:id/cancel` | Cancel now or at period end | Ready |
| `POST /v1/subscriptions/:id/pause` | Pause | Ready |
| `POST /v1/subscriptions/:id/resume` | Resume | Ready |
| `POST /v1/subscriptions/:id/change-plan` | Change plan with proration | Ready |

---

## Invoices + Customers (merchant)

| Contract | Purpose | Status |
|---|---|---|
| `GET /v1/invoices` | Invoice list | Ready |
| `GET /v1/invoices/:id` | Invoice detail | Ready |
| `POST /v1/invoices/:id/void` | Void invoice | Ready |
| `GET /v1/customers` | Customer list | Ready |
| `GET /v1/customers/:id` | Customer detail | Ready |

---

## Portal (subscriber)

| Contract | Purpose | Status |
|---|---|---|
| `GET /v1/portal/:token` | Portal overview | Ready |
| `GET /v1/portal/:token/invoices` | Portal invoice history | Ready |
| `GET /v1/portal/:token/available-plans` | Available plans for change | Ready |
| `POST /v1/portal/:token/cancel` | Cancel at period end | Ready |
| `POST /v1/portal/:token/update-card` | Start card update flow | Ready |
| `POST /v1/portal/:token/change-plan` | Apply plan change | Ready |

---

## Webhooks + Events (merchant)

| Contract | Purpose | Status |
|---|---|---|
| `POST /v1/webhooks/endpoints` | Register endpoint (signing secret handling differs from “shown once” UX) | Partial |
| `GET /v1/webhooks/endpoints` | List endpoints | Ready |
| `DELETE /v1/webhooks/endpoints/:id` | Delete endpoint | Ready |
| `GET /v1/webhooks/deliveries` | Delivery log | Ready |
| `GET /v1/events` | Audit log | Ready |

---

## Revenue (merchant)

| Contract | Purpose | Status |
|---|---|---|
| `GET /v1/fees/summary` | KPI summary | Ready |
| `GET /v1/fees/rate` | Fee rate | Ready |
| `GET /v1/fees/ledger` | Fee ledger rows | Ready |
| `GET /v1/fees/invoices/:invoiceId` | Fee breakdown for an invoice | Ready |
