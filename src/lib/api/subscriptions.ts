import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import { fetchAllPages } from "#/lib/api/pagination.ts";
import {
	changePlanResponseSchema,
	customerEntitySchema,
	pageResponseSchema,
	planResponseSchema,
	subscriptionEntitySchema,
} from "#/lib/api/response-schemas.ts";
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
					responseSchema: pageResponseSchema(subscriptionEntitySchema()),
				}),
			),
			fetchAllPages((page) =>
				backendRequest<PageResponse<CustomerEntityDto>>({
					path: "/v1/customers",
					search: { page, perPage: 100 },
					responseSchema: pageResponseSchema(customerEntitySchema()),
				}),
			),
			fetchAllPages((page) =>
				backendRequest<PageResponse<PlanResponseDto>>({
					path: "/v1/plans",
					search: { page, perPage: 100 },
					responseSchema: pageResponseSchema(planResponseSchema()),
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

// Cheap total-count check (no join data, size:1) so the "N past due" banner
// doesn't require pulling every subscription just to count one status.
export const countPastDueSubscriptions = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		const page = await backendRequest<PageResponse<SubscriptionEntityDto>>({
			path: "/v1/subscriptions",
			search: { status: "past_due", page: 0, size: 1 },
			responseSchema: pageResponseSchema(subscriptionEntitySchema()),
		});
		return page.totalElements;
	});

// Same cheap-count trick, scoped to one plan — powers the "N active
// subscriptions" link on the plan detail page. Was previously a hardcoded
// placeholder (`plan.status === "published" ? 4 : 0`).
export const countActiveSubscriptionsForPlan = createServerFn({
	method: "GET",
})
	.middleware([requireSessionCookieMiddleware])
	.validator(z.object({ planId: z.string().min(1) }))
	.handler(async ({ data }) => {
		const page = await backendRequest<PageResponse<SubscriptionEntityDto>>({
			path: "/v1/subscriptions",
			search: { status: "active", planId: data.planId, page: 0, size: 1 },
			responseSchema: pageResponseSchema(subscriptionEntitySchema()),
		});
		return page.totalElements;
	});

const searchSubscriptionsSchema = z.object({
	status: z.string().optional(),
	planId: z.string().optional(),
	q: z.string().optional(),
	page: z.number().default(0),
	size: z.number().default(10),
});

// Real server-side pagination for the Subscriptions list page — unlike
// listSubscriptionSummaries above (which stays a full-table fetch: the
// Overview dashboard needs it for aggregate counts/trends across every
// subscription, not one page of them; that's a job for a backend stats
// endpoint, not pagination, and out of scope here). Customer/plan display
// fields are joined only for the rows on this page, not the whole table.
export const searchSubscriptionSummaries = createServerFn({
	method: "GET",
})
	.middleware([requireSessionCookieMiddleware])
	.validator(searchSubscriptionsSchema)
	.handler(async ({ data }) => {
		const subscriptionsPage = await backendRequest<
			PageResponse<SubscriptionEntityDto>
		>({
			path: "/v1/subscriptions",
			search: {
				status: data.status,
				planId: data.planId,
				q: data.q,
				page: data.page,
				size: data.size,
			},
			responseSchema: pageResponseSchema(subscriptionEntitySchema()),
		});

		const customerIds = [
			...new Set(subscriptionsPage.content.map((s) => s.customerId)),
		];
		const planIds = [
			...new Set(subscriptionsPage.content.map((s) => s.planId)),
		];

		const [customers, plans] = await Promise.all([
			Promise.all(
				customerIds.map((id) =>
					backendRequest<CustomerEntityDto>({
						path: `/v1/customers/${id}`,
						responseSchema: customerEntitySchema(),
					}),
				),
			),
			Promise.all(
				planIds.map((id) =>
					backendRequest<PlanResponseDto>({
						path: `/v1/plans/${id}`,
						responseSchema: planResponseSchema(),
					}),
				),
			),
		]);

		const customersById = new Map(customers.map((c) => [c.id, c]));
		const plansById = new Map(plans.map((p) => [p.id, p]));

		return {
			...subscriptionsPage,
			content: subscriptionsPage.content.map((subscription) => {
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
			}),
		};
	});

export const getSubscriptionDetail = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(subscriptionIdSchema)
	.handler(async ({ data }) => {
		const subscription = await backendRequest<SubscriptionEntityDto>({
			path: `/v1/subscriptions/${data.subscriptionId}`,
			responseSchema: subscriptionEntitySchema(),
		});

		const [customer, plan] = await Promise.all([
			backendRequest<CustomerEntityDto>({
				path: `/v1/customers/${subscription.customerId}`,
				responseSchema: customerEntitySchema(),
			}),
			backendRequest<PlanResponseDto>({
				path: `/v1/plans/${subscription.planId}`,
				responseSchema: planResponseSchema(),
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
			responseSchema: subscriptionEntitySchema(),
		});
	});

export const pauseSubscription = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(subscriptionIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<SubscriptionEntityDto>({
			path: `/v1/subscriptions/${data.subscriptionId}/pause`,
			method: "POST",
			responseSchema: subscriptionEntitySchema(),
		});
	});

export const resumeSubscription = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(subscriptionIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<SubscriptionEntityDto>({
			path: `/v1/subscriptions/${data.subscriptionId}/resume`,
			method: "POST",
			responseSchema: subscriptionEntitySchema(),
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
			responseSchema: changePlanResponseSchema(),
		});
	});
