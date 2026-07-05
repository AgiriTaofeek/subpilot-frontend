import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import { fetchAllPages } from "#/lib/api/pagination.ts";
import type {
	CancelSubscriptionRequestDto,
	ChangePlanRequestDto,
	ChangePlanResponseDto,
	CustomerEntityDto,
	PageResponse,
	PlanResponseDto,
	SubscriptionEntityDto,
} from "#/types/api.ts";

const subscriptionIdSchema = z.object({
	subscriptionId: z.string().min(1),
});

const cancelSchema = z.object({
	subscriptionId: z.string().min(1),
	immediate: z.boolean(),
	reason: z.string().optional(),
});

const changePlanSchema = z.object({
	subscriptionId: z.string().min(1),
	newPlanId: z.string().min(1),
});

export const listSubscriptionSummaries = createServerFn({
	method: "GET",
})
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
	const [subscriptions, customers, plans] = await Promise.all([
		fetchAllPages((page) =>
			backendRequest<PageResponse<SubscriptionEntityDto>>({
				path: "/v1/subscriptions",
				search: { page, size: 100 },
			}),
		),
		fetchAllPages((page) =>
			backendRequest<PageResponse<CustomerEntityDto>>({
				path: "/v1/customers",
				search: { page, perPage: 100 },
			}),
		),
		fetchAllPages((page) =>
			backendRequest<PageResponse<PlanResponseDto>>({
				path: "/v1/plans",
				search: { page, perPage: 100 },
			}),
		),
	]);

	const customersById = new Map(
		customers.map((customer) => [customer.id, customer]),
	);
	const plansById = new Map(plans.map((plan) => [plan.id, plan]));

	return subscriptions.map((subscription) => {
		const customer = customersById.get(subscription.customerId);
		const plan = plansById.get(subscription.planId);

		return {
			id: subscription.id,
			customerId: subscription.customerId,
			customerName: customer?.fullName ?? "Unknown customer",
			customerEmail: customer?.email ?? "Unknown email",
			planId: subscription.planId,
			planName: plan?.name ?? "Unknown plan",
			status: subscription.status,
			amountKobo: plan?.amount ?? 0,
			nextBillingDate: subscription.nextBillingDate,
			currentPeriodEnd:
				subscription.currentPeriodEnd ??
				subscription.nextBillingDate ??
				subscription.createdAt,
			nextRetryAt: null,
			cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
			updatedAt: subscription.updatedAt,
			createdAt: subscription.createdAt,
		};
	});
});

export const getSubscriptionDetail = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(subscriptionIdSchema)
	.handler(async ({ data }) => {
		const subscription = await backendRequest<SubscriptionEntityDto>({
			path: `/v1/subscriptions/${data.subscriptionId}`,
		});

		const [customer, plan] = await Promise.all([
			backendRequest<CustomerEntityDto>({
				path: `/v1/customers/${subscription.customerId}`,
			}),
			backendRequest<PlanResponseDto>({
				path: `/v1/plans/${subscription.planId}`,
			}),
		]);

		return { subscription, customer, plan };
	});

export const cancelSubscription = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(cancelSchema)
	.handler(async ({ data }) => {
		return backendRequest<SubscriptionEntityDto>({
			path: `/v1/subscriptions/${data.subscriptionId}/cancel`,
			method: "POST",
			body: {
				immediate: data.immediate,
				reason: data.reason,
			} satisfies CancelSubscriptionRequestDto,
		});
	});

export const pauseSubscription = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(subscriptionIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<SubscriptionEntityDto>({
			path: `/v1/subscriptions/${data.subscriptionId}/pause`,
			method: "POST",
		});
	});

export const resumeSubscription = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(subscriptionIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<SubscriptionEntityDto>({
			path: `/v1/subscriptions/${data.subscriptionId}/resume`,
			method: "POST",
		});
	});

export const changePlanSubscription = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(changePlanSchema)
	.handler(async ({ data }) => {
		return backendRequest<ChangePlanResponseDto>({
			path: `/v1/subscriptions/${data.subscriptionId}/change-plan`,
			method: "POST",
			body: { newPlanId: data.newPlanId } satisfies ChangePlanRequestDto,
		});
	});
