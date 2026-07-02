import { queryOptions } from "@tanstack/react-query";

import type { SubscriptionStatus } from "#/data/subscriptions.ts";
import {
	getCustomerDetail,
	listCustomerSummaries,
} from "#/lib/api/customers.ts";

export interface CustomerSummary {
	id: string;
	name: string;
	email: string;
	phone: string;
	cardBrand: string;
	cardLast4: string;
	cardExpiry: string;
	createdAt: string;
	subscriptionSummary: Array<{ status: SubscriptionStatus; count: number }>;
	mostRecentSubscriptionUpdate: string | null;
}

export const customersListQueryOptions = () =>
	queryOptions({
		queryKey: ["customers"],
		queryFn: () => listCustomerSummaries(),
	});

export const customerDetailQueryOptions = (customerId: string) =>
	queryOptions({
		queryKey: ["customers", customerId],
		queryFn: () => getCustomerDetail({ data: { customerId } }),
	});
