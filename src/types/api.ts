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
