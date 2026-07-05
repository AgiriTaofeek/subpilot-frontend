export interface BackendErrorShape {
	error?: {
		code?: string;
		message?: string;
		request_id?: string;
		timestamp?: string;
	};
}

export interface PageResponse<T> {
	content: T[];
	totalElements: number;
	totalPages: number;
	size: number;
	number: number;
	numberOfElements: number;
	first: boolean;
	last: boolean;
	empty: boolean;
}

export interface AuthSessionDto {
	merchantId: string;
	userId: string;
	email: string;
	businessName: string;
}

export type BillingIntervalDto =
	| "daily"
	| "weekly"
	| "monthly"
	| "quarterly"
	| "yearly"
	| "custom";

export type ProrationPolicyDto = "none" | "credit" | "charge";

export type PlanStatusDto = "draft" | "published" | "archived";

export interface PlanResponseDto {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	amount: number;
	currency: string;
	billingInterval: BillingIntervalDto;
	trialDays: number;
	prorationPolicy: ProrationPolicyDto;
	status: PlanStatusDto;
	hostedUrl: string | null;
	createdAt: string;
}

export interface CreatePlanRequestDto {
	name: string;
	description: string | null;
	amount: number;
	currency: string;
	billingInterval: BillingIntervalDto;
	intervalValue?: number;
	intervalUnit?: string;
	trialDays: number;
	prorationPolicy: ProrationPolicyDto;
}

export interface UpdatePlanRequestDto {
	name?: string;
	description?: string | null;
	trialDays?: number;
}

export interface PublicPlanResponseDto {
	name: string;
	description: string | null;
	amount: number;
	currency: string;
	billingInterval: BillingIntervalDto;
	trialDays: number;
	merchantName: string;
	merchantSlug: string;
	planSlug: string;
}

export interface CheckoutRequestDto {
	email: string;
	fullName: string;
	phone: string;
	merchantSlug: string;
	planSlug: string;
}

export interface CheckoutInitResponseDto {
	subscriptionId: string;
	checkoutUrl: string;
	checkoutReference: string;
}

export type SubscriptionStatusDto =
	| "trialing"
	| "active"
	| "past_due"
	| "suspended"
	| "paused"
	| "cancelled"
	| "expired";

export interface SubscriptionEntityDto {
	id: string;
	merchantId: string;
	customerId: string;
	planId: string;
	status: SubscriptionStatusDto;
	currentPeriodStart: string | null;
	currentPeriodEnd: string | null;
	nextBillingDate: string | null;
	trialEndsAt: string | null;
	cancelAtPeriodEnd: boolean;
	cancelledAt: string | null;
	cancellationReason: string | null;
	pausedAt: string | null;
	nombaCustomerRef: string | null;
	nombaCardTokenRef: string | null;
	pendingCardUpdateAt: string | null;
	subscriptionToken: string;
	createdAt: string;
	updatedAt: string;
}

export interface CustomerEntityDto {
	id: string;
	merchantId: string;
	fullName: string;
	email: string;
	phone: string | null;
	nombaCustomerId: string | null;
	cardToken: string | null;
	cardLast4: string | null;
	cardExpiry: string | null;
	cardBrand: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CancelSubscriptionRequestDto {
	reason?: string;
	immediate: boolean;
}

export interface ChangePlanRequestDto {
	newPlanId: string;
}

export interface ChangePlanResponseDto {
	subscriptionId: string;
	previousPlanId: string;
	newPlanId: string;
	cycleDays: number;
	unusedDays: number;
	creditAmount: number;
	newPlanProrated: number;
	netChargeToday: number;
	netCreditForward: number;
	chargedImmediately: boolean;
	takesEffectNextCycle: boolean;
	paymentStatus: string | null;
}

export type InvoiceStatusDto =
	| "pending"
	| "paid"
	| "failed"
	| "void"
	| "refunded";

export interface InvoiceEntityDto {
	id: string;
	merchantId: string;
	subscriptionId: string;
	customerId: string;
	invoiceNumber: string;
	amount: number;
	currency: string;
	status: InvoiceStatusDto;
	dueDate: string;
	paidAt: string | null;
	periodStart: string;
	periodEnd: string;
	prorationNote: string | null;
	platformFeeAmount: number;
	netAmount: number;
	feeBpsApplied: number | null;
	feeFixedApplied: number | null;
	nombaReference: string | null;
	createdAt: string;
	updatedAt: string;
}

export type AuditEventTypeDto =
	| "MERCHANT_CREATED"
	| "PLAN_CREATED"
	| "PLAN_UPDATED"
	| "PLAN_PUBLISHED"
	| "PLAN_ARCHIVED"
	| "SUBSCRIPTION_CREATED"
	| "SUBSCRIPTION_ACTIVATED"
	| "SUBSCRIPTION_RENEWED"
	| "SUBSCRIPTION_PAUSED"
	| "SUBSCRIPTION_RESUMED"
	| "SUBSCRIPTION_CANCELLED"
	| "SUBSCRIPTION_EXPIRED"
	| "SUBSCRIPTION_PAST_DUE"
	| "SUBSCRIPTION_SUSPENDED"
	| "PAYMENT_INITIATED"
	| "PAYMENT_SUCCEEDED"
	| "PAYMENT_FAILED"
	| "INVOICE_CREATED"
	| "INVOICE_PAID"
	| "INVOICE_VOIDED"
	| "DUNNING_STARTED"
	| "DUNNING_STEP_EXECUTED"
	| "DUNNING_RESOLVED"
	| "DUNNING_EXHAUSTED"
	| "DUNNING_RECOVERED"
	| "PRORATION_APPLIED"
	| "WEBHOOK_DELIVERED"
	| "WEBHOOK_FAILED"
	| "REFUND_CREATED"
	| "REFUND_SUCCEEDED"
	| "REFUND_FAILED";

export interface AuditEventDto {
	id: string;
	merchantId: string;
	type: AuditEventTypeDto;
	resourceType: string;
	resourceId: string;
	subscriptionId: string | null;
	payload: string;
	createdAt: string;
}

export interface FeeSummaryDto {
	totalGrossAmount: number;
	totalFeeAmount: number;
	totalNetAmount: number;
	currency: string;
	periodStart: string;
	periodEnd: string;
}

export interface MerchantFeeRateDto {
	feeBps: number;
	feeFixedMinor: number;
	isOverride: boolean;
}

export interface PayoutBankDto {
	name: string;
	bankCode: string;
}

export interface PayoutBankLookupResultDto {
	found: boolean;
	accountNumber: string | null;
	accountName: string | null;
	failureReason: string | null;
}

export type DisbursementStatusDto = "pending" | "succeeded" | "failed";

export interface DisbursementDto {
	id: string;
	amount: number;
	currency: string;
	status: DisbursementStatusDto;
	invoiceCount: number;
	periodStart: string | null;
	periodEnd: string;
	nombaTransferReference: string | null;
	failureReason: string | null;
	createdAt: string | null;
	resolvedAt: string | null;
}

export interface ApiKeyResponseDto {
	id: string;
	label: string;
	prefix: string;
	rawKey?: string;
	createdAt: string;
	lastUsedAt: string | null;
	active: boolean;
}

export interface WebhookEndpointDto {
	id: string;
	merchantId: string;
	url: string;
	description: string | null;
	subscribedEvents: string[];
	active: boolean;
	signingSecretHash: string;
	createdAt: string;
	updatedAt: string;
}

export interface RegisterEndpointRequestDto {
	url: string;
	description?: string;
	events: string[];
}

export type WebhookDeliveryStatusDto = "pending" | "succeeded" | "failed";

export interface WebhookDeliveryDto {
	id: string;
	merchantId: string;
	endpointId: string;
	eventId: string;
	status: WebhookDeliveryStatusDto;
	attemptCount: number;
	lastAttemptedAt: string | null;
	nextRetryAt: string | null;
	responseStatus: number | null;
	responseBody: string | null;
	createdAt: string;
}

export interface AnalyticsSummaryDto {
	mrr: number;
	activeSubscribers: number;
	churnRatePercent: number;
	paymentSuccessRatePercent: number;
	failedPaymentsCount: number;
	failedPaymentsValue: number;
	newSubscribersInRange: number;
	periodStart: string;
	periodEnd: string;
}

export interface ChartPointDto {
	bucket: string;
	value: number;
}

export interface TimeSeriesChartDto {
	points: ChartPointDto[];
	granularity: string;
}

export type DunningStepActionDto = "retry_charge" | "send_email" | "both";

export type DunningEmailTemplateDto =
	| "payment_failed"
	| "final_warning"
	| "service_suspended";

export interface DunningStepDto {
	id: string;
	stepNumber: number;
	dayOffset: number;
	action: DunningStepActionDto;
	emailTemplate: DunningEmailTemplateDto | null;
	createdAt: string;
}

export interface DunningCampaignDto {
	id: string;
	name: string;
	gracePeriodDays: number;
	maxAttempts: number;
	isDefault: boolean;
	cancelAfterExhaustion: boolean;
	steps: DunningStepDto[];
	createdAt: string;
	updatedAt: string;
}

export interface UpdateDunningCampaignRequestDto {
	name?: string;
	gracePeriodDays?: number;
	maxAttempts?: number;
	cancelAfterExhaustion?: boolean;
}

export interface CreateDunningStepRequestDto {
	dayOffset: number;
	action: DunningStepActionDto;
	emailTemplate?: DunningEmailTemplateDto | null;
}

export interface UpdateDunningStepRequestDto {
	dayOffset?: number;
	action?: DunningStepActionDto;
	emailTemplate?: DunningEmailTemplateDto | null;
}

export type AuditActorTypeDto = "user" | "api_key";

export interface AuditLogDto {
	id: string;
	merchantId: string;
	actorId: string;
	actorType: AuditActorTypeDto;
	action: string;
	resourceType: string;
	resourceId: string;
	beforeSnapshot: string | null;
	afterSnapshot: string | null;
	createdAt: string;
}

export interface PortalSubscriptionViewDto {
	subscriptionId: string;
	status: SubscriptionStatusDto;
	planName: string;
	planAmount: number;
	currency: string;
	billingInterval: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	nextBillingDate: string | null;
	trialEndsAt: string | null;
	cancelAtPeriodEnd: boolean;
	cardLast4: string | null;
	cardBrand: string | null;
}

export interface PortalInvoiceViewDto {
	invoiceId: string;
	invoiceNumber: string;
	amount: number;
	currency: string;
	status: InvoiceStatusDto;
	dueDate: string;
	paidAt: string | null;
	periodStart: string;
	periodEnd: string;
}

export interface PortalAvailablePlanDto {
	planId: string;
	name: string;
	amount: number;
	currency: string;
	billingInterval: string;
}

export type RefundStatusDto =
	| "pending_approval"
	| "pending"
	| "succeeded"
	| "failed"
	| "rejected";

export interface RefundResponseDto {
	id: string;
	invoiceId: string;
	amount: number;
	currency: string;
	platformFeeRefunded: number;
	status: RefundStatusDto;
	reason: string | null;
	nombaReference: string | null;
	failureReason: string | null;
	createdAt: string;
	resolvedAt: string | null;
}

export interface CreateRefundRequestDto {
	amount?: number;
	reason?: string;
}

export interface PortalCancelRequestDto {
	reason?: string;
}

export interface PortalUpdateCardResponseDto {
	checkoutUrl: string;
	reference: string;
}
