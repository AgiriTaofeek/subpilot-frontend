import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import type {
	CustomerDetailResponseDto,
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

/** All of one customer's subscriptions — bounded to a single customer, not a full-table scan. */
async function fetchSubscriptionsForCustomer(customerId: string) {
	const page = await backendRequest<PageResponse<SubscriptionEntityDto>>({
		path: "/v1/subscriptions",
		search: { customerId, page: 0, size: 100 },
	});
	return page.content;
}

const listCustomersSchema = z.object({
	q: z.string().optional(),
	page: z.number().default(0),
	size: z.number().default(10),
});

export const listCustomerSummaries = createServerFn({
	method: "GET",
})
	.middleware([requireSessionCookieMiddleware])
	.validator(listCustomersSchema)
	.handler(async ({ data }) => {
		const customersPage = await backendRequest<PageResponse<CustomerEntityDto>>(
			{
				path: "/v1/customers",
				search: { q: data.q, page: data.page, perPage: data.size },
			},
		);

		// Subscriptions are only fetched for the customers on this page (bounded
		// by page size), not the whole table — same fix as the list endpoint
		// itself, just one join hop down.
		const subscriptionsByCustomerId = new Map<
			string,
			SubscriptionEntityDto[]
		>();
		await Promise.all(
			customersPage.content.map(async (customer) => {
				subscriptionsByCustomerId.set(
					customer.id,
					await fetchSubscriptionsForCustomer(customer.id),
				);
			}),
		);

		return {
			...customersPage,
			content: customersPage.content.map((customer) => {
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
			}),
		};
	});

export const getCustomerDetail = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(customerIdSchema)
	.handler(async ({ data }) => {
		const [customer, subscriptions] = await Promise.all([
			backendRequest<CustomerDetailResponseDto>({
				path: `/v1/customers/${data.customerId}`,
			}),
			fetchSubscriptionsForCustomer(data.customerId),
		]);

		const plansById = new Map<string, PlanResponseDto>();
		await Promise.all(
			[...new Set(subscriptions.map((s) => s.planId))].map(async (planId) => {
				plansById.set(
					planId,
					await backendRequest<PlanResponseDto>({
						path: `/v1/plans/${planId}`,
					}),
				);
			}),
		);

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
				// Nomba's tokenized-card list can include incomplete records (no
				// PAN) from abandoned/failed tokenization attempts — not a real
				// saved card a merchant should see.
				savedCards: customer.savedCards.filter((card) => card.cardPan),
			},
			subscriptions: subscriptions.map((subscription) => {
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
			}),
		};
	});
