import { createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";

// One schema per DTO in #/types/api.ts, kept field-for-field identical to
// those interfaces (which themselves mirror the Java backend's response
// records) — passed as `responseSchema` to backendRequest/internalBackendRequest
// so a drift between what Java actually returns and what this app assumes
// gets logged (dev-only — see backend.ts) instead of silently reaching the
// browser as `undefined` somewhere with no trace of why. As of the "never
// block on schema drift" change in backend.ts, a mismatch here is
// diagnostic-only: it does NOT throw or drop the response — the raw payload
// still reaches the caller, cast to the declared type. Treat every field
// here as "the shape we currently believe is true and want a dev-console
// warning if it changes," not as an enforced runtime contract — a stale
// `required` on a field Java has since made nullable no longer breaks a
// page in any environment, but it's still worth fixing when you spot one
// locally so the type stays honest for callers relying on it.
//
// Every object schema uses .passthrough(): a bare z.object() strips any key
// it doesn't recognize, which would mean validating a response also narrows
// it — the frontend would silently stop receiving any field Java adds that
// this file hasn't caught up on yet. Passthrough keeps the "did the fields
// we depend on show up correctly" guarantee without sacrificing "is this
// the exact backend response."
//
// Every schema is wrapped in createServerOnlyFn — these are only ever
// consumed inside backendRequest/internalBackendRequest (both themselves
// server-only), but a plain top-level `export const fooSchema = z.object(...)`
// has no marker telling the bundler that, so it got pulled into the client
// bundle wherever a handler referenced it (confirmed: ~30KB gzipped of pure
// validation code shipped to every visitor for zero client-side use).
// createServerOnlyFn is a build-time marker the tanstackStart() Vite plugin
// recognizes and strips from client output — wrapping schema *construction*
// in it (not just backendRequest's own body) gets the same exclusion.
// Confirmed empirically: a field unique to a wrapped schema was absent from
// the built client bundle; the same field left unwrapped was present.

export const pageResponseSchema = createServerOnlyFn(
	<Item extends z.ZodTypeAny>(item: Item) =>
		z
			.object({
				content: z.array(item),
				totalElements: z.number(),
				totalPages: z.number(),
				size: z.number(),
				number: z.number(),
				numberOfElements: z.number(),
				first: z.boolean(),
				last: z.boolean(),
				empty: z.boolean(),
			})
			.passthrough(),
);

export const messageResponseSchema = createServerOnlyFn(() =>
	z.object({ message: z.string() }).passthrough(),
);
export const okResponseSchema = createServerOnlyFn(() =>
	z.object({ ok: z.boolean() }).passthrough(),
);

const billingIntervalSchema = z.enum([
	"daily",
	"weekly",
	"monthly",
	"quarterly",
	"yearly",
	"custom",
]);
const prorationPolicySchema = z.enum(["none", "credit", "charge"]);
const planStatusSchema = z.enum(["draft", "published", "archived"]);
const subscriptionStatusSchema = z.enum([
	"trialing",
	"active",
	"past_due",
	"suspended",
	"paused",
	"cancelled",
	"expired",
]);
const invoiceStatusSchema = z.enum([
	"pending",
	"paid",
	"failed",
	"void",
	"refunded",
]);
const disbursementStatusSchema = z.enum(["pending", "succeeded", "failed"]);
const webhookDeliveryStatusSchema = z.enum(["pending", "succeeded", "failed"]);
const dunningStepActionSchema = z.enum(["retry_charge", "send_email", "both"]);
const dunningEmailTemplateSchema = z.enum([
	"payment_failed",
	"final_warning",
	"service_suspended",
]);
const auditActorTypeSchema = z.enum(["user", "api_key"]);
// RefundStatus.java (co.subpilot.refund.RefundStatus) is a plain class of
// String constants, not a real Java enum — nothing on the backend
// guarantees a refund's status column only ever holds one of the 5 values
// below. A closed z.enum here means any legacy/unrecognized value fails
// this field's validation (same bug class as the audit-event-type and
// merchant-status issues elsewhere in this file).
const refundStatusSchema = z.string();
const merchantStatusSchema = z.enum(["active", "under_review", "suspended"]);
const internalAdminRoleSchema = z.enum(["super_admin", "ops_admin"]);

export const authSessionSchema = createServerOnlyFn(() =>
	z
		.object({
			merchantId: z.string(),
			userId: z.string(),
			email: z.string(),
			businessName: z.string(),
			status: merchantStatusSchema,
		})
		.passthrough(),
);

export const planResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			name: z.string(),
			slug: z.string(),
			description: z.string().nullable(),
			amount: z.number(),
			currency: z.string(),
			billingInterval: billingIntervalSchema,
			trialDays: z.number(),
			prorationPolicy: prorationPolicySchema,
			status: planStatusSchema,
			hostedUrl: z.string().nullable(),
			createdAt: z.string(),
		})
		.passthrough(),
);

export const publicPlanResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			name: z.string(),
			description: z.string().nullable(),
			amount: z.number(),
			currency: z.string(),
			billingInterval: billingIntervalSchema,
			trialDays: z.number(),
			merchantName: z.string(),
			merchantSlug: z.string(),
			planSlug: z.string(),
		})
		.passthrough(),
);

export const checkoutInitResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			subscriptionId: z.string(),
			checkoutUrl: z.string(),
			checkoutReference: z.string(),
		})
		.passthrough(),
);

export const subscriptionEntitySchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			merchantId: z.string(),
			customerId: z.string(),
			planId: z.string(),
			status: subscriptionStatusSchema,
			currentPeriodStart: z.string().nullable(),
			currentPeriodEnd: z.string().nullable(),
			nextBillingDate: z.string().nullable(),
			trialEndsAt: z.string().nullable(),
			cancelAtPeriodEnd: z.boolean(),
			cancelledAt: z.string().nullable(),
			cancellationReason: z.string().nullable(),
			pausedAt: z.string().nullable(),
			nombaCustomerRef: z.string().nullable(),
			nombaCardTokenRef: z.string().nullable(),
			pendingCardUpdateAt: z.string().nullable(),
			subscriptionToken: z.string(),
			createdAt: z.string(),
			updatedAt: z.string(),
		})
		.passthrough(),
);

export const customerEntitySchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			merchantId: z.string(),
			fullName: z.string(),
			email: z.string(),
			phone: z.string().nullable(),
			nombaCustomerId: z.string().nullable(),
			// @JsonIgnore on Customer.cardToken (co.subpilot.customer.entity.Customer)
			// — the raw-entity list response never includes this key at all,
			// not even as null, so it must be optional here, not just nullable.
			cardToken: z.string().nullable().optional(),
			cardLast4: z.string().nullable(),
			cardExpiry: z.string().nullable(),
			cardBrand: z.string().nullable(),
			createdAt: z.string(),
			updatedAt: z.string(),
		})
		.passthrough(),
);

// NombaGatewayImpl#listTokenizedCards reads every one of these off Nomba's
// external API response via `.asText(null)` (JsonNode.path(...).asText(null)),
// so any of them — not just the one that happened to trip validation first —
// is null whenever Nomba's response is missing or malformed for that key.
// None of these fields have a backend-side guarantee of being present.
const savedCardSchema = z
	.object({
		tokenKey: z.string().nullable(),
		cardType: z.string().nullable(),
		cardPan: z.string().nullable(),
		tokenExpirationDate: z.string().nullable(),
	})
	.passthrough();

export const customerDetailResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			merchantId: z.string(),
			fullName: z.string(),
			email: z.string(),
			phone: z.string().nullable(),
			nombaCustomerId: z.string().nullable(),
			cardToken: z.string().nullable(),
			cardLast4: z.string().nullable(),
			cardExpiry: z.string().nullable(),
			cardBrand: z.string().nullable(),
			createdAt: z.string(),
			savedCards: z.array(savedCardSchema),
		})
		.passthrough(),
);

export const changePlanResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			subscriptionId: z.string(),
			previousPlanId: z.string(),
			newPlanId: z.string(),
			cycleDays: z.number(),
			unusedDays: z.number(),
			creditAmount: z.number(),
			newPlanProrated: z.number(),
			netChargeToday: z.number(),
			netCreditForward: z.number(),
			chargedImmediately: z.boolean(),
			takesEffectNextCycle: z.boolean(),
			paymentStatus: z.string().nullable(),
		})
		.passthrough(),
);

export const invoiceEntitySchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			merchantId: z.string(),
			subscriptionId: z.string(),
			customerId: z.string(),
			invoiceNumber: z.string(),
			amount: z.number(),
			currency: z.string(),
			status: invoiceStatusSchema,
			dueDate: z.string(),
			paidAt: z.string().nullable(),
			periodStart: z.string(),
			periodEnd: z.string(),
			prorationNote: z.string().nullable(),
			platformFeeAmount: z.number(),
			netAmount: z.number(),
			feeBpsApplied: z.number().nullable(),
			feeFixedApplied: z.number().nullable(),
			nombaReference: z.string().nullable(),
			createdAt: z.string(),
			updatedAt: z.string(),
		})
		.passthrough(),
);

export const auditEventSchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			merchantId: z.string(),
			// Java's `Event.type` (co.subpilot.event.entity.Event) is a plain
			// `String` column — EventType is just a bag of String constants,
			// not a real Java `enum` — so nothing on the backend guarantees
			// this only ever holds one of the values in AuditEventTypeDto.
			// A closed z.enum() here meant any legacy/unrecognized value
			// (old data predating a rename, a value added server-side that
			// this file hasn't caught up on) failed safeParse and dropped
			// the entire events page, not just that one row. UI call sites
			// only ever render `event.type` as raw text, never look it up
			// in a map keyed by AuditEventTypeDto, so a plain string is safe.
			type: z.string(),
			resourceType: z.string(),
			resourceId: z.string(),
			subscriptionId: z.string().nullable(),
			payload: z.string(),
			createdAt: z.string(),
		})
		.passthrough(),
);

export const feeSummarySchema = createServerOnlyFn(() =>
	z
		.object({
			totalGrossAmount: z.number(),
			totalFeeAmount: z.number(),
			totalNetAmount: z.number(),
			currency: z.string(),
			periodStart: z.string(),
			periodEnd: z.string(),
		})
		.passthrough(),
);

export const merchantFeeRateSchema = createServerOnlyFn(() =>
	z
		.object({
			feeBps: z.number(),
			feeFixedMinor: z.number(),
			isOverride: z.boolean(),
		})
		.passthrough(),
);

export const payoutBankSchema = createServerOnlyFn(() =>
	z
		.object({
			name: z.string(),
			bankCode: z.string(),
		})
		.passthrough(),
);

export const payoutBankLookupResultSchema = createServerOnlyFn(() =>
	z
		.object({
			found: z.boolean(),
			accountNumber: z.string().nullable(),
			accountName: z.string().nullable(),
			failureReason: z.string().nullable(),
			bankCode: z.string().nullable(),
		})
		.passthrough(),
);

export const disbursementSchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			amount: z.number(),
			currency: z.string(),
			status: disbursementStatusSchema,
			invoiceCount: z.number(),
			periodStart: z.string().nullable(),
			periodEnd: z.string(),
			nombaTransferReference: z.string().nullable(),
			failureReason: z.string().nullable(),
			createdAt: z.string().nullable(),
			resolvedAt: z.string().nullable(),
		})
		.passthrough(),
);

export const apiKeyResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			label: z.string(),
			prefix: z.string(),
			// AuthService.toApiKeyResponse always sets this field, but it's
			// explicitly `null` (not omitted) for every entry from the list
			// endpoint — only the create-key response has a real value. Jackson
			// serializes that as a literal `null`, which .optional() alone
			// rejects (it only accepts a missing key), so list calls threw.
			rawKey: z.string().nullable().optional(),
			createdAt: z.string(),
			lastUsedAt: z.string().nullable(),
			active: z.boolean(),
		})
		.passthrough(),
);

export const webhookEndpointSchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			merchantId: z.string(),
			url: z.string(),
			description: z.string().nullable(),
			subscribedEvents: z.array(z.string()),
			active: z.boolean(),
			signingSecretHash: z.string(),
			createdAt: z.string(),
			updatedAt: z.string(),
		})
		.passthrough(),
);

export const webhookDeliverySchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			merchantId: z.string(),
			endpointId: z.string(),
			eventId: z.string(),
			status: webhookDeliveryStatusSchema,
			attemptCount: z.number(),
			lastAttemptedAt: z.string().nullable(),
			nextRetryAt: z.string().nullable(),
			responseStatus: z.number().nullable(),
			responseBody: z.string().nullable(),
			createdAt: z.string(),
		})
		.passthrough(),
);

export const analyticsSummarySchema = createServerOnlyFn(() =>
	z
		.object({
			mrr: z.number(),
			activeSubscribers: z.number(),
			churnRatePercent: z.number(),
			paymentSuccessRatePercent: z.number(),
			failedPaymentsCount: z.number(),
			failedPaymentsValue: z.number(),
			newSubscribersInRange: z.number(),
			periodStart: z.string(),
			periodEnd: z.string(),
		})
		.passthrough(),
);

const chartPointSchema = z
	.object({
		bucket: z.string(),
		value: z.number(),
	})
	.passthrough();

export const timeSeriesChartSchema = createServerOnlyFn(() =>
	z
		.object({
			points: z.array(chartPointSchema),
			granularity: z.string(),
		})
		.passthrough(),
);

const dunningStepSchemaInner = z
	.object({
		id: z.string(),
		stepNumber: z.number(),
		dayOffset: z.number(),
		action: dunningStepActionSchema,
		emailTemplate: dunningEmailTemplateSchema.nullable(),
		createdAt: z.string(),
	})
	.passthrough();

export const dunningStepSchema = createServerOnlyFn(
	() => dunningStepSchemaInner,
);

export const dunningCampaignSchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			name: z.string(),
			gracePeriodDays: z.number(),
			maxAttempts: z.number(),
			isDefault: z.boolean(),
			cancelAfterExhaustion: z.boolean(),
			steps: z.array(dunningStepSchemaInner),
			createdAt: z.string(),
			updatedAt: z.string(),
		})
		.passthrough(),
);

export const auditLogSchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			merchantId: z.string(),
			actorId: z.string(),
			actorType: auditActorTypeSchema,
			action: z.string(),
			resourceType: z.string(),
			resourceId: z.string(),
			beforeSnapshot: z.string().nullable(),
			afterSnapshot: z.string().nullable(),
			createdAt: z.string(),
		})
		.passthrough(),
);

export const portalSubscriptionViewSchema = createServerOnlyFn(() =>
	z
		.object({
			subscriptionId: z.string(),
			status: subscriptionStatusSchema,
			planName: z.string(),
			planAmount: z.number(),
			currency: z.string(),
			billingInterval: z.string(),
			currentPeriodStart: z.string(),
			currentPeriodEnd: z.string(),
			nextBillingDate: z.string().nullable(),
			trialEndsAt: z.string().nullable(),
			cancelAtPeriodEnd: z.boolean(),
			cardLast4: z.string().nullable(),
			cardBrand: z.string().nullable(),
		})
		.passthrough(),
);

export const portalInvoiceViewSchema = createServerOnlyFn(() =>
	z
		.object({
			invoiceId: z.string(),
			invoiceNumber: z.string(),
			amount: z.number(),
			currency: z.string(),
			status: invoiceStatusSchema,
			dueDate: z.string(),
			paidAt: z.string().nullable(),
			periodStart: z.string(),
			periodEnd: z.string(),
		})
		.passthrough(),
);

export const portalAvailablePlanSchema = createServerOnlyFn(() =>
	z
		.object({
			planId: z.string(),
			name: z.string(),
			amount: z.number(),
			currency: z.string(),
			billingInterval: z.string(),
		})
		.passthrough(),
);

export const refundResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			invoiceId: z.string(),
			amount: z.number(),
			currency: z.string(),
			platformFeeRefunded: z.number(),
			status: refundStatusSchema,
			reason: z.string().nullable(),
			nombaReference: z.string().nullable(),
			failureReason: z.string().nullable(),
			createdAt: z.string(),
			resolvedAt: z.string().nullable(),
		})
		.passthrough(),
);

export const adminRefundResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			merchantId: z.string(),
			invoiceId: z.string(),
			amount: z.number(),
			currency: z.string(),
			platformFeeRefunded: z.number(),
			status: refundStatusSchema,
			reason: z.string().nullable(),
			nombaReference: z.string().nullable(),
			failureReason: z.string().nullable(),
			resolvedByAdminId: z.string().nullable(),
			createdAt: z.string(),
			resolvedAt: z.string().nullable(),
		})
		.passthrough(),
);

export const portalUpdateCardResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			checkoutUrl: z.string(),
			reference: z.string(),
		})
		.passthrough(),
);

export const internalAdminSessionSchema = createServerOnlyFn(() =>
	z
		.object({
			adminId: z.string(),
			email: z.string(),
			role: internalAdminRoleSchema,
			displayName: z.string(),
		})
		.passthrough(),
);

export const internalMerchantListItemSchema = createServerOnlyFn(() =>
	z
		.object({
			merchantId: z.string(),
			businessName: z.string(),
			email: z.string(),
			slug: z.string(),
			status: merchantStatusSchema,
			feeSource: z.string(),
			createdAt: z.string(),
			updatedAt: z.string(),
		})
		.passthrough(),
);

export const internalMerchantDetailSchema = createServerOnlyFn(() =>
	z
		.object({
			merchantId: z.string(),
			businessName: z.string(),
			email: z.string(),
			slug: z.string(),
			status: merchantStatusSchema,
			feeSource: z.string(),
			effectiveFeeBps: z.number(),
			effectiveFixedFeeMinor: z.number(),
			overrideFeeBps: z.number().nullable(),
			overrideFixedFeeMinor: z.number().nullable(),
			createdAt: z.string(),
			updatedAt: z.string(),
		})
		.passthrough(),
);

export const internalMerchantFeeResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			feeSource: z.string(),
			platformDefaultFeeBps: z.number(),
			platformDefaultFixedFeeMinor: z.number(),
			overrideFeeBps: z.number().nullable(),
			overrideFixedFeeMinor: z.number().nullable(),
			effectiveFeeBps: z.number(),
			effectiveFixedFeeMinor: z.number(),
		})
		.passthrough(),
);

export const internalDefaultFeeResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			feeBps: z.number(),
			fixedFeeMinor: z.number(),
			updatedAt: z.string(),
			// PlatformFeeDefault.updatedByAdminId has no not-null DB constraint
			// and getOrBootstrap() never sets it — a never-touched default row
			// (fresh deploy, or one that just migrated to this feature) returns
			// it as a literal `null`, not a missing key.
			updatedByAdminId: z.string().nullable(),
		})
		.passthrough(),
);

const jsonValueSchema: z.ZodType<
	string | number | boolean | null | JsonValueArray | JsonValueRecord
> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(z.string(), jsonValueSchema),
	]),
);
type JsonValueArray = Array<
	string | number | boolean | null | JsonValueArray | JsonValueRecord
>;
type JsonValueRecord = {
	[key: string]:
		| string
		| number
		| boolean
		| null
		| JsonValueArray
		| JsonValueRecord;
};

export const internalAuditLogSchema = createServerOnlyFn(() =>
	z
		.object({
			auditId: z.string(),
			actorAdminId: z.string(),
			actorEmail: z.string(),
			targetType: z.string(),
			targetId: z.string(),
			actionType: z.string(),
			oldValue: jsonValueSchema.nullable(),
			newValue: jsonValueSchema.nullable(),
			reason: z.string().nullable(),
			createdAt: z.string(),
		})
		.passthrough(),
);

export const internalDashboardSummarySchema = createServerOnlyFn(() =>
	z
		.object({
			pendingMerchantActivations: z.number(),
			pendingRefundApprovals: z.number(),
		})
		.passthrough(),
);

export const internalPlatformSummarySchema = createServerOnlyFn(() =>
	z
		.object({
			totalGmvMinor: z.number(),
			subpilotRevenueMinor: z.number(),
			totalNetPaidOutMinor: z.number(),
			activeSubscriptions: z.number(),
			newSubscriptionsInWindow: z.number(),
			activeMerchants: z.number(),
		})
		.passthrough(),
);

export const internalMerchantRevenueRowSchema = createServerOnlyFn(() =>
	z
		.object({
			merchantId: z.string(),
			businessName: z.string(),
			// See InternalMerchantRevenueRowDto — InternalAnalyticsService falls
			// back to the literal "unknown" for an orphaned merchant reference,
			// so this isn't a closed merchantStatusSchema.
			merchantStatus: z.union([merchantStatusSchema, z.literal("unknown")]),
			grossAmountMinor: z.number(),
			subpilotFeeMinor: z.number(),
			netAmountMinor: z.number(),
			transactionCount: z.number(),
			activeSubscriptions: z.number(),
		})
		.passthrough(),
);

export const internalDailyRevenuePointSchema = createServerOnlyFn(() =>
	z
		.object({
			date: z.string(),
			subpilotRevenueMinor: z.number(),
			gmvMinor: z.number(),
		})
		.passthrough(),
);

export const internalAnalyticsResponseSchema = createServerOnlyFn(() =>
	z
		.object({
			summary: internalPlatformSummarySchema(),
			merchants: z.array(internalMerchantRevenueRowSchema()),
			dailySeries: z.array(internalDailyRevenuePointSchema()),
			from: z.string(),
			to: z.string(),
		})
		.passthrough(),
);
