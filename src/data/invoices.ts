import { queryOptions } from "@tanstack/react-query";
import {
	getInvoiceSummary,
	listInvoiceSummaries,
	listInvoiceSummariesForSubscription,
} from "#/lib/api/invoices.ts";
import type { InvoiceStatusDto } from "#/types/api.ts";

export interface InvoiceSummary {
	id: string;
	number: string;
	subscriptionId: string;
	customerId: string;
	customerName: string;
	customerEmail: string;
	planName: string;
	status: InvoiceStatusDto;
	grossKobo: number;
	feeKobo: number;
	netKobo: number;
	periodStart: string;
	periodEnd: string;
	createdAt: string;
}

export const invoiceStatusTone: Record<
	InvoiceStatusDto,
	"success" | "warning" | "danger" | "neutral"
> = {
	paid: "success",
	pending: "warning",
	failed: "danger",
	void: "neutral",
	refunded: "neutral",
};

export const invoiceStatusLabel: Record<InvoiceStatusDto, string> = {
	paid: "Paid",
	pending: "Pending",
	failed: "Failed",
	void: "Void",
	refunded: "Refunded",
};

export const invoicesListQueryOptions = () =>
	queryOptions({
		queryKey: ["invoices"],
		queryFn: () => listInvoiceSummaries(),
	});

export const invoiceDetailQueryOptions = (invoiceId: string) =>
	queryOptions({
		queryKey: ["invoices", invoiceId],
		queryFn: () => getInvoiceSummary({ data: { invoiceId } }),
	});

export const invoicesForSubscriptionQueryOptions = (subscriptionId: string) =>
	queryOptions({
		queryKey: ["invoices", "subscription", subscriptionId],
		queryFn: () =>
			listInvoiceSummariesForSubscription({ data: { subscriptionId } }),
	});
