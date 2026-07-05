import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { SubscriptionStatus } from "#/data/subscriptions.ts";
import {
	getCustomerDetail,
	listCustomerSummaries,
} from "#/lib/api/customers.ts";
import type { PageSize } from "#/lib/pagination-sizes.ts";

export const CUSTOMERS_PAGE_SIZE: PageSize = 10;

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

export const customersListQueryOptions = (params: {
	q?: string;
	page: number;
	size?: PageSize;
}) =>
	queryOptions({
		queryKey: ["customers", params],
		queryFn: () =>
			listCustomerSummaries({
				data: {
					q: params.q,
					page: params.page - 1,
					size: params.size ?? CUSTOMERS_PAGE_SIZE,
				},
			}),
		placeholderData: keepPreviousData,
	});

export const customerDetailQueryOptions = (customerId: string) =>
	queryOptions({
		queryKey: ["customers", customerId],
		queryFn: () => getCustomerDetail({ data: { customerId } }),
	});
