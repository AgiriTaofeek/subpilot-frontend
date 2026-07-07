import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import { fetchAllPages } from "#/lib/api/pagination.ts";
import type {
	CustomerEntityDto,
	InvoiceEntityDto,
	PageResponse,
	PlanResponseDto,
	RefundResponseDto,
	SubscriptionEntityDto,
} from "#/types/api.ts";

const invoiceIdSchema = z.object({
	invoiceId: z.string().min(1),
});

export const voidInvoice = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(invoiceIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<InvoiceEntityDto>({
			path: `/v1/invoices/${data.invoiceId}/void`,
			method: "POST",
		});
	});

const createRefundSchema = z.object({
	invoiceId: z.string().min(1),
	amount: z.number().positive().optional(),
	reason: z.string().max(500).optional(),
});

export const createInvoiceRefund = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(createRefundSchema)
	.handler(async ({ data }) => {
		return backendRequest<RefundResponseDto>({
			path: `/v1/invoices/${data.invoiceId}/refund`,
			method: "POST",
			body: { amount: data.amount, reason: data.reason },
		});
	});

export const listInvoiceRefunds = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(invoiceIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<RefundResponseDto[]>({
			path: `/v1/invoices/${data.invoiceId}/refund`,
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
		feeBpsApplied: invoice.feeBpsApplied,
		feeFixedApplied: invoice.feeFixedApplied,
		periodStart: invoice.periodStart,
		periodEnd: invoice.periodEnd,
		createdAt: invoice.createdAt,
	};
}

/** Builds the customer/plan-name lookup maps for exactly the invoices passed in — bounded to one page, not the whole table. */
async function fetchInvoiceJoinDataForPage(invoices: InvoiceEntityDto[]) {
	const customerIds = [...new Set(invoices.map((i) => i.customerId))];
	const subscriptionIds = [...new Set(invoices.map((i) => i.subscriptionId))];

	const [customers, subscriptions] = await Promise.all([
		Promise.all(
			customerIds.map((id) =>
				backendRequest<CustomerEntityDto>({ path: `/v1/customers/${id}` }),
			),
		),
		Promise.all(
			subscriptionIds.map((id) =>
				backendRequest<SubscriptionEntityDto>({
					path: `/v1/subscriptions/${id}`,
				}),
			),
		),
	]);

	const planIds = [...new Set(subscriptions.map((s) => s.planId))];
	const plans = await Promise.all(
		planIds.map((id) =>
			backendRequest<PlanResponseDto>({ path: `/v1/plans/${id}` }),
		),
	);

	const customersById = new Map(customers.map((c) => [c.id, c]));
	const plansById = new Map(plans.map((p) => [p.id, p]));
	const planNameBySubscriptionId = new Map(
		subscriptions.map((subscription) => [
			subscription.id,
			plansById.get(subscription.planId)?.name ?? "Unknown plan",
		]),
	);

	return { customersById, planNameBySubscriptionId };
}

const searchInvoicesSchema = z.object({
	status: z.string().optional(),
	q: z.string().optional(),
	page: z.number().default(0),
	size: z.number().default(10),
});

// Real server-side pagination for the Invoices list page — unlike
// listInvoiceSummaries below (kept as a full-table fetch for the Revenue
// dashboard's charts, which need every invoice to bucket into a trend line,
// not one page of them), this joins customer/plan display data only for the
// invoices on the requested page.
export const searchInvoiceSummaries = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(searchInvoicesSchema)
	.handler(async ({ data }) => {
		const invoicesPage = await backendRequest<PageResponse<InvoiceEntityDto>>({
			path: "/v1/invoices",
			search: {
				status: data.status,
				q: data.q,
				page: data.page,
				size: data.size,
			},
		});

		const { customersById, planNameBySubscriptionId } =
			await fetchInvoiceJoinDataForPage(invoicesPage.content);

		return {
			...invoicesPage,
			content: invoicesPage.content.map((invoice) =>
				mapInvoiceSummary(invoice, customersById, planNameBySubscriptionId),
			),
		};
	});

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
})
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
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
	.middleware([requireSessionCookieMiddleware])
	.validator(invoiceIdSchema)
	.handler(async ({ data }) => {
		const invoice = await backendRequest<InvoiceEntityDto>({
			path: `/v1/invoices/${data.invoiceId}`,
		});

		// Bounded to this one invoice's customer/subscription/plan — not the
		// whole-table fetchInvoiceJoinData(), which paged through every
		// customer/subscription/plan the merchant has just to resolve one name.
		const { customersById, planNameBySubscriptionId } =
			await fetchInvoiceJoinDataForPage([invoice]);

		return mapInvoiceSummary(invoice, customersById, planNameBySubscriptionId);
	});

export const listInvoiceSummariesForSubscription = createServerFn({
	method: "GET",
})
	.middleware([requireSessionCookieMiddleware])
	.validator(z.object({ subscriptionId: z.string().min(1) }))
	.handler(async ({ data }) => {
		const invoicesPage = await backendRequest<PageResponse<InvoiceEntityDto>>({
			path: "/v1/invoices",
			search: { page: 0, size: 10, subscriptionId: data.subscriptionId },
		});

		// Bounded to the customers/plans referenced by these invoices — see
		// getInvoiceSummary above for why, same reasoning.
		const { customersById, planNameBySubscriptionId } =
			await fetchInvoiceJoinDataForPage(invoicesPage.content);

		return invoicesPage.content
			.map((invoice) =>
				mapInvoiceSummary(invoice, customersById, planNameBySubscriptionId),
			)
			.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);
	});
