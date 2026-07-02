import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { backendRequest } from "#/lib/api/backend.ts";
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
	const [customersPage, subscriptionsPage] = await Promise.all([
		backendRequest<PageResponse<CustomerEntityDto>>({
			path: "/v1/customers",
			search: { page: 0, perPage: 100 },
		}),
		backendRequest<PageResponse<SubscriptionEntityDto>>({
			path: "/v1/subscriptions",
			search: { page: 0, size: 100 },
		}),
	]);

	const subscriptionsByCustomerId = new Map<string, SubscriptionEntityDto[]>();
	for (const subscription of subscriptionsPage.content) {
		const list = subscriptionsByCustomerId.get(subscription.customerId) ?? [];
		list.push(subscription);
		subscriptionsByCustomerId.set(subscription.customerId, list);
	}

	return { customersPage, subscriptionsByCustomerId };
}

export const listCustomerSummaries = createServerFn({
	method: "GET",
}).handler(async () => {
	const { customersPage, subscriptionsByCustomerId } =
		await fetchCustomersAndSubscriptions();

	return customersPage.content.map((customer) => {
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
	.validator(customerIdSchema)
	.handler(async ({ data }) => {
		const [customer, subscriptionsPage, plansPage] = await Promise.all([
			backendRequest<CustomerEntityDto>({
				path: `/v1/customers/${data.customerId}`,
			}),
			backendRequest<PageResponse<SubscriptionEntityDto>>({
				path: "/v1/subscriptions",
				search: { page: 0, size: 100 },
			}),
			backendRequest<PageResponse<PlanResponseDto>>({
				path: "/v1/plans",
				search: { page: 0, perPage: 100 },
			}),
		]);

		const plansById = new Map(plansPage.content.map((plan) => [plan.id, plan]));
		const subscriptions = subscriptionsPage.content
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
