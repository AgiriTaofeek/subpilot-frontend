import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import { fetchAllPages } from "#/lib/api/pagination.ts";
import type {
	CustomerEntityDto,
	PageResponse,
	PlanResponseDto,
	SubscriptionEntityDto,
} from "#/types/api.ts";

const customerIdSchema = z.object({
	customerId: z.string().min(1),
});

function summarizeSubscriptions(subscriptions: SubscriptionEntityDto[]) {
	const counts = new Map<SubscriptionEntityDto["status"], number>();
	for (const sub of subscriptions) {
		counts.set(sub.status, (counts.get(sub.status) ?? 0) + 1);
	}
	return Array.from(counts.entries()).map(([status, count]) => ({
		status,
		count,
	}));
}

function mostRecentUpdate(subscriptions: SubscriptionEntityDto[]) {
	if (subscriptions.length === 0) return null;
	return subscriptions.reduce<string | null>((latest, sub) => {
		if (!latest) return sub.updatedAt;
		return new Date(sub.updatedAt) > new Date(latest) ? sub.updatedAt : latest;
	}, null);
}

async function fetchCustomersAndSubscriptions() {
	const [customers, subscriptions] = await Promise.all([
		fetchAllPages((page) =>
			backendRequest<PageResponse<CustomerEntityDto>>({
				path: "/v1/customers",
				search: { page, perPage: 100 },
			}),
		),
		fetchAllPages((page) =>
			backendRequest<PageResponse<SubscriptionEntityDto>>({
				path: "/v1/subscriptions",
				search: { page, size: 100 },
			}),
		),
	]);

	const subscriptionsByCustomerId = new Map<string, SubscriptionEntityDto[]>();
	for (const subscription of subscriptions) {
		const list = subscriptionsByCustomerId.get(subscription.customerId) ?? [];
		list.push(subscription);
		subscriptionsByCustomerId.set(subscription.customerId, list);
	}

	return { customers, subscriptionsByCustomerId };
}

export const listCustomerSummaries = createServerFn({
	method: "GET",
})
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		const { customers, subscriptionsByCustomerId } =
			await fetchCustomersAndSubscriptions();

		return customers.map((customer) => {
			const customerSubscriptions =
				subscriptionsByCustomerId.get(customer.id) ?? [];

			return {
				id: customer.id,
				name: customer.fullName,
				email: customer.email,
				phone: customer.phone ?? "—",
				cardBrand: customer.cardBrand ?? "—",
				cardLast4: customer.cardLast4 ?? "----",
				cardExpiry: customer.cardExpiry ?? "—",
				createdAt: customer.createdAt,
				subscriptionSummary: summarizeSubscriptions(customerSubscriptions),
				mostRecentSubscriptionUpdate: mostRecentUpdate(customerSubscriptions),
			};
		});
	});

export const getCustomerDetail = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(customerIdSchema)
	.handler(async ({ data }) => {
		// Backend has no customerId filter on /v1/subscriptions, so finding one
		// customer's subscriptions means walking every subscription page. Worth
		// a backend filter param if this list grows large enough to make this
		// expensive.
		const [customer, allSubscriptions, allPlans] = await Promise.all([
			backendRequest<CustomerEntityDto>({
				path: `/v1/customers/${data.customerId}`,
			}),
			fetchAllPages((page) =>
				backendRequest<PageResponse<SubscriptionEntityDto>>({
					path: "/v1/subscriptions",
					search: { page, size: 100 },
				}),
			),
			fetchAllPages((page) =>
				backendRequest<PageResponse<PlanResponseDto>>({
					path: "/v1/plans",
					search: { page, perPage: 100 },
				}),
			),
		]);

		const plansById = new Map(allPlans.map((plan) => [plan.id, plan]));
		const subscriptions = allSubscriptions
			.filter((subscription) => subscription.customerId === data.customerId)
			.map((subscription) => {
				const plan = plansById.get(subscription.planId);
				return {
					id: subscription.id,
					planId: subscription.planId,
					planName: plan?.name ?? "Unknown plan",
					status: subscription.status,
					amountKobo: plan?.amount ?? 0,
					nextBillingDate: subscription.nextBillingDate,
					createdAt: subscription.createdAt,
					updatedAt: subscription.updatedAt,
				};
			});

		return {
			customer: {
				id: customer.id,
				name: customer.fullName,
				email: customer.email,
				phone: customer.phone,
				cardBrand: customer.cardBrand ?? "—",
				cardLast4: customer.cardLast4 ?? "----",
				cardExpiry: customer.cardExpiry ?? "—",
				createdAt: customer.createdAt,
			},
			subscriptions,
		};
	});
