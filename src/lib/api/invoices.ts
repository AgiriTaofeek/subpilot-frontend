import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { backendRequest } from "#/lib/api/backend.ts";
import { fetchAllPages } from "#/lib/api/pagination.ts";
import type {
	CustomerEntityDto,
	InvoiceEntityDto,
	PageResponse,
	PlanResponseDto,
	SubscriptionEntityDto,
} from "#/types/api.ts";

const invoiceIdSchema = z.object({
	invoiceId: z.string().min(1),
});

export const voidInvoice = createServerFn({ method: "POST" })
	.validator(invoiceIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<InvoiceEntityDto>({
			path: `/v1/invoices/${data.invoiceId}/void`,
			method: "POST",
		});
	});

function mapInvoiceSummary(
	invoice: InvoiceEntityDto,
	customersById: Map<string, CustomerEntityDto>,
	planNameBySubscriptionId: Map<string, string>,
) {
	const customer = customersById.get(invoice.customerId);
	return {
		id: invoice.id,
		number: invoice.invoiceNumber,
		subscriptionId: invoice.subscriptionId,
		customerId: invoice.customerId,
		customerName: customer?.fullName ?? "Unknown customer",
		customerEmail: customer?.email ?? "unknown@example.com",
		planName: planNameBySubscriptionId.get(invoice.subscriptionId) ?? "—",
		status: invoice.status,
		grossKobo: invoice.amount,
		feeKobo: invoice.platformFeeAmount,
		netKobo: invoice.netAmount,
		periodStart: invoice.periodStart,
		periodEnd: invoice.periodEnd,
		createdAt: invoice.createdAt,
	};
}

async function fetchInvoiceJoinData() {
	const [customers, subscriptions, plans] = await Promise.all([
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
	const planNameBySubscriptionId = new Map(
		subscriptions.map((subscription) => [
			subscription.id,
			plansById.get(subscription.planId)?.name ?? "Unknown plan",
		]),
	);

	return { customersById, planNameBySubscriptionId };
}

export const listInvoiceSummaries = createServerFn({
	method: "GET",
}).handler(async () => {
	const [invoices, { customersById, planNameBySubscriptionId }] =
		await Promise.all([
			fetchAllPages((page) =>
				backendRequest<PageResponse<InvoiceEntityDto>>({
					path: "/v1/invoices",
					search: { page, size: 100 },
				}),
			),
			fetchInvoiceJoinData(),
		]);

	return invoices.map((invoice) =>
		mapInvoiceSummary(invoice, customersById, planNameBySubscriptionId),
	);
});

export const getInvoiceSummary = createServerFn({ method: "GET" })
	.validator(invoiceIdSchema)
	.handler(async ({ data }) => {
		const [invoice, { customersById, planNameBySubscriptionId }] =
			await Promise.all([
				backendRequest<InvoiceEntityDto>({
					path: `/v1/invoices/${data.invoiceId}`,
				}),
				fetchInvoiceJoinData(),
			]);

		return mapInvoiceSummary(invoice, customersById, planNameBySubscriptionId);
	});

export const listInvoiceSummariesForSubscription = createServerFn({
	method: "GET",
})
	.validator(z.object({ subscriptionId: z.string().min(1) }))
	.handler(async ({ data }) => {
		const [invoicesPage, { customersById, planNameBySubscriptionId }] =
			await Promise.all([
				backendRequest<PageResponse<InvoiceEntityDto>>({
					path: "/v1/invoices",
					search: { page: 0, size: 10, subscriptionId: data.subscriptionId },
				}),
				fetchInvoiceJoinData(),
			]);

		return invoicesPage.content
			.map((invoice) =>
				mapInvoiceSummary(invoice, customersById, planNameBySubscriptionId),
			)
			.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);
	});
