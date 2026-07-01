import { createServerFn } from "@tanstack/react-start";

import { backendRequest } from "#/lib/api/backend.ts";
import type {
	CustomerEntityDto,
	PageResponse,
	PlanResponseDto,
	SubscriptionEntityDto,
} from "#/types/api.ts";

export const listSubscriptionSummaries = createServerFn({
	method: "GET",
}).handler(async () => {
	const [subscriptionsPage, customersPage, plansPage] = await Promise.all([
		backendRequest<PageResponse<SubscriptionEntityDto>>({
			path: "/v1/subscriptions",
			search: { page: 0, size: 100 },
		}),
		backendRequest<PageResponse<CustomerEntityDto>>({
			path: "/v1/customers",
			search: { page: 0, perPage: 100 },
		}),
		backendRequest<PageResponse<PlanResponseDto>>({
			path: "/v1/plans",
			search: { page: 0, perPage: 100 },
		}),
	]);

	const customersById = new Map(
		customersPage.content.map((customer) => [customer.id, customer]),
	);
	const plansById = new Map(plansPage.content.map((plan) => [plan.id, plan]));

	return subscriptionsPage.content.map((subscription) => {
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
