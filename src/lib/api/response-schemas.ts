import { createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";

// One schema per DTO in #/types/api.ts, kept field-for-field identical to
// those interfaces (which themselves mirror the Java backend's response
// records) — passed as `responseSchema` to backendRequest/internalBackendRequest
// so a drift between what Java actually returns and what this app assumes
// throws a caught, classifiable error instead of silently reaching the
// browser as `undefined` somewhere.
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
const refundStatusSchema = z.enum([
	"pending_approval",
	"pending",
	"succeeded",
	"failed",
	"rejected",
]);
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
			cardToken: z.string().nullable(),
			cardLast4: z.string().nullable(),
			cardExpiry: z.string().nullable(),
			cardBrand: z.string().nullable(),
			createdAt: z.string(),
			updatedAt: z.string(),
		})
		.passthrough(),
);

const savedCardSchema = z
	.object({
		tokenKey: z.string(),
		cardType: z.string(),
		cardPan: z.string(),
		tokenExpirationDate: z.string(),
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

const auditEventTypeSchema = z.enum([
	"MERCHANT_CREATED",
	"PLAN_CREATED",
	"PLAN_UPDATED",
	"PLAN_PUBLISHED",
	"PLAN_ARCHIVED",
	"SUBSCRIPTION_CREATED",
	"SUBSCRIPTION_ACTIVATED",
	"SUBSCRIPTION_RENEWED",
	"SUBSCRIPTION_PAUSED",
	"SUBSCRIPTION_RESUMED",
	"SUBSCRIPTION_CANCELLED",
	"SUBSCRIPTION_EXPIRED",
	"SUBSCRIPTION_PAST_DUE",
	"SUBSCRIPTION_SUSPENDED",
	"PAYMENT_INITIATED",
	"PAYMENT_SUCCEEDED",
	"PAYMENT_FAILED",
	"INVOICE_CREATED",
	"INVOICE_PAID",
	"INVOICE_VOIDED",
	"DUNNING_STARTED",
	"DUNNING_STEP_EXECUTED",
	"DUNNING_RESOLVED",
	"DUNNING_EXHAUSTED",
	"DUNNING_RECOVERED",
	"PRORATION_APPLIED",
	"WEBHOOK_DELIVERED",
	"WEBHOOK_FAILED",
	"REFUND_CREATED",
	"REFUND_SUCCEEDED",
	"REFUND_FAILED",
]);

export const auditEventSchema = createServerOnlyFn(() =>
	z
		.object({
			id: z.string(),
			merchantId: z.string(),
			type: auditEventTypeSchema,
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
			rawKey: z.string().optional(),
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
			updatedByAdminId: z.string(),
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
