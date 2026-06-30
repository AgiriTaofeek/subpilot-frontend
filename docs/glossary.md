# Glossary

The authoritative vocabulary for the SubPilot domain. Every term used in code, docs, and UI should match a definition here. When two people mean different things by the same word, add or clarify the entry.

---

## Merchant

A business or product team that uses SubPilot to manage subscriptions on behalf of their customers. A Merchant authenticates with a JWT (dashboard console) or an API Key (programmatic). Every data object in the system is scoped to exactly one Merchant — there is no cross-merchant visibility.

---

## Subscriber (Customer)

An end-user who subscribes to a Merchant's plan. In the data model this is a `Customer` entity. Subscribers do not have login credentials; they access their self-service portal via a **Subscription Token** embedded in a URL.

---

## Plan

A reusable billing template created by a Merchant. A Plan defines the amount, billing interval, trial period, proration policy, and other terms that apply to every Subscription created under it. Plans follow a three-state lifecycle: `draft → published → archived`.

---

## Plan Status

The lifecycle state of a Plan.

| Value       | Meaning                                                                            |
| ----------- | ---------------------------------------------------------------------------------- |
| `draft`     | Created but not yet accepting subscriptions                                        |
| `published` | Active — new subscriptions can be created against this plan                        |
| `archived`  | Deprecated — no new subscriptions; existing subscriptions continue until cancelled |

---

## Billing Interval

How frequently a Subscription is billed.

| Value       | Meaning                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| `daily`     | Charged every day                                                                    |
| `weekly`    | Charged every 7 days                                                                 |
| `monthly`   | Charged on the same calendar day each month                                          |
| `quarterly` | Charged every 3 months                                                               |
| `yearly`    | Charged once per year                                                                |
| `custom`    | Charged every N days/weeks/months, as configured by `intervalValue` + `intervalUnit` |

---

## Proration Policy

How a plan change mid-cycle is settled financially. Set on the Plan, applied when a Subscriber changes plans.

| Value    | Behaviour                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `none`   | Plan change takes effect at the start of the next billing cycle. No immediate charge or credit.                                                       |
| `credit` | Unused days on the old plan are credited. On upgrade, the difference is charged immediately. On downgrade, the credit is carried to the next invoice. |
| `charge` | Same as `credit` — difference charged or credited immediately in both directions.                                                                     |

---

## Subscription

The record that binds a Subscriber to a Plan and tracks the full billing lifecycle. A Subscription has a **status**, a current billing period (start/end dates), a stored tokenised card, and links to every Invoice and Payment Attempt ever made against it.

---

## Subscription Status

The state-machine value of a Subscription. Only certain transitions are valid (see [architecture.md](architecture.md)).

| Value       | Meaning                                                          |
| ----------- | ---------------------------------------------------------------- |
| `trialing`  | Within the free trial window; card collected but not yet charged |
| `active`    | Billing normally; renewals succeed                               |
| `past_due`  | The most recent renewal charge failed; dunning is in progress    |
| `paused`    | Billing suspended by the Merchant; will not renew until resumed  |
| `cancelled` | Terminated (by subscriber or merchant); **terminal**             |
| `expired`   | Fixed term ended naturally; **terminal**                         |

---

## Subscription Token

An opaque UUID attached to every Subscription. Used exclusively to authenticate the **customer self-service portal** (`/portal/:token`). It is not a session token and carries no merchant-level permissions. Treat it like a shareable but secret URL — it is not rotated unless the card-update checkout flow issues a new one.

---

## Invoice

A billing record created for each subscription renewal (and for proration charges). An Invoice records the gross amount, the platform fee deducted, the net amount owed to the Merchant, and the billing period it covers. Invoice numbers are sequential per Merchant (e.g., `INV-001`).

---

## Invoice Status

| Value      | Meaning                                                                             |
| ---------- | ----------------------------------------------------------------------------------- |
| `pending`  | Created, awaiting payment attempt                                                   |
| `paid`     | Charge succeeded                                                                    |
| `failed`   | All payment attempts for this invoice failed                                        |
| `void`     | Merchant voided the invoice before payment                                          |
| `refunded` | Payment reversed after a successful charge (backend feature pending — display only) |

---

## Payment Attempt

A single charge request sent to the Nomba gateway for a given Invoice. An Invoice may have multiple Payment Attempts if retries occur (see Dunning). Each attempt records the Nomba reference, failure code, and resolution timestamp.

---

## Payment Attempt Status

| Value        | Meaning                                      |
| ------------ | -------------------------------------------- |
| `pending`    | Created, not yet sent to gateway             |
| `processing` | Sent to Nomba, awaiting webhook confirmation |
| `succeeded`  | Nomba confirmed the charge                   |
| `failed`     | Nomba declined or timed out                  |

---

## Tokenised Card

A card reference issued by Nomba when a Subscriber completes a checkout. SubPilot stores this token (never the raw card number) and uses it for all future recurring charges via the Nomba Charge API. The UI displays the last 4 digits, brand (Visa/Mastercard), and expiry from the `Customer` record.

---

## Dunning Campaign

A retry schedule that kicks in when a Payment Attempt fails. Each Merchant has a default campaign. A campaign defines a grace period, a maximum number of retry attempts, and an ordered list of **Dunning Steps**.

---

## Dunning Step

One action within a Dunning Campaign, executed at a specified number of days after the initial failure. Possible actions: retry the charge, send an email, or both.

---

## Dunning Execution

The live record of a dunning run for a specific Subscription + Invoice pair. It tracks the current step, overall status (`active`, `resolved`, `exhausted`, `cancelled`), and timestamps. When resolved, the subscription returns to `active`. When exhausted, the subscription transitions to `cancelled` or `expired` depending on campaign configuration.

---

## Platform Fee

SubPilot's revenue share, captured on every successful Invoice. Calculated as `(gross × feeBps / 10_000) + feeFixed`. The Merchant receives `gross − platformFee` (the **net amount**). Fees are recorded in an immutable ledger — they are never updated after capture.

---

## Proration Record

The financial calculation produced when a Subscriber changes plans mid-cycle. Records the credit for unused days on the old plan and the pro-rata charge for the new plan. The net result is either an immediate charge (upgrade) or a credit applied to the next invoice (downgrade).

---

## Webhook Endpoint

A Merchant-registered HTTPS URL that SubPilot POSTs events to. Each endpoint declares which event types it subscribes to. Deliveries are signed with HMAC-SHA256 and retried on failure.

---

## Webhook Delivery

One delivery attempt for one event to one endpoint. Tracks HTTP response status, response body, attempt count, and next retry time.

---

## API Key

A programmatic authentication credential for Merchants. Never stored in plain text — only the hash and a display prefix are persisted. The raw key is shown once at creation. Used in the `Authorization: Bearer <key>` header for server-to-server calls.

---

## Hosted Checkout URL

A Nomba-generated URL where a new Subscriber enters their card details to start a subscription. SubPilot generates this URL via the Nomba Checkout API when a subscriber initiates checkout at `/v1/public/plans/:merchantSlug/:planSlug/checkout`. The same mechanism is used for the card-update flow in the customer portal.

---

## Nomba Reference

The transaction identifier assigned by Nomba to a payment. Stored on both the Invoice (`nombaReference`) and the Payment Attempt (`nombaReference`). Used to correlate inbound Nomba webhooks with internal records.

---

## Kobo

The minor monetary unit used throughout the backend API (1 NGN = 100 kobo). All `amount`, `feeAmount`, `netAmount`, and related fields in API responses are in kobo. The frontend converts these to NGN for display using the shared `formatNGN(kobo)` utility. **Never display kobo values directly to users.**

---

## Merchant Slug

A URL-friendly unique identifier for a Merchant (e.g., `acme-corp`). Used in public plan URLs so subscribers can reach the checkout page without knowing the Merchant's internal ID.

---

## Plan Slug

A URL-friendly unique identifier for a Plan within a Merchant's namespace (e.g., `pro-monthly`). Combined with the Merchant Slug it forms the hosted checkout URL: `/v1/public/plans/:merchantSlug/:planSlug/checkout`.

---

## Event (Audit Log)

An immutable append-only record of every significant action in the system. Events are used for audit trails and for triggering outbound webhooks. They are never updated or deleted. See [data-modeling.md](data-modeling.md) for the full event type catalogue.
