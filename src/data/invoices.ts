import { queryOptions } from "@tanstack/react-query";
import {
	getInvoiceSummary,
	listInvoiceRefunds,
	listInvoiceSummaries,
	listInvoiceSummariesForSubscription,
} from "#/lib/api/invoices.ts";
import type { InvoiceStatusDto, RefundStatusDto } from "#/types/api.ts";

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

export const refundStatusTone: Record<
	RefundStatusDto,
	"success" | "warning" | "danger" | "neutral"
> = {
	pending_approval: "warning",
	pending: "warning",
	succeeded: "success",
	failed: "danger",
	rejected: "danger",
};

export const refundStatusLabel: Record<RefundStatusDto, string> = {
	pending_approval: "Pending approval",
	pending: "Processing",
	succeeded: "Refunded",
	failed: "Failed",
	rejected: "Rejected",
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

export const invoiceRefundsQueryOptions = (invoiceId: string) =>
	queryOptions({
		queryKey: ["invoices", invoiceId, "refunds"],
		queryFn: () => listInvoiceRefunds({ data: { invoiceId } }),
	});

export const invoicesForSubscriptionQueryOptions = (subscriptionId: string) =>
	queryOptions({
		queryKey: ["invoices", "subscription", subscriptionId],
		queryFn: () =>
			listInvoiceSummariesForSubscription({ data: { subscriptionId } }),
	});
