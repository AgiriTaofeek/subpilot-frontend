import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
	getInvoiceSummary,
	listInvoiceRefunds,
	listInvoiceSummaries,
	listInvoiceSummariesForSubscription,
	searchInvoiceSummaries,
} from "#/lib/api/invoices.ts";
import type { PageSize } from "#/lib/pagination-sizes.ts";
import type { InvoiceStatusDto, RefundStatusDto } from "#/types/api.ts";

export const INVOICES_PAGE_SIZE: PageSize = 10;

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
	feeBpsApplied: number | null;
	feeFixedApplied: number | null;
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

const REFUND_STATUS_TONE: Record<
	RefundStatusDto,
	"success" | "warning" | "danger" | "neutral"
> = {
	pending_approval: "warning",
	pending: "warning",
	succeeded: "success",
	failed: "danger",
	rejected: "danger",
};

const REFUND_STATUS_LABEL: Record<RefundStatusDto, string> = {
	pending_approval: "Pending approval",
	pending: "Processing",
	succeeded: "Refunded",
	failed: "Failed",
	rejected: "Rejected",
};

function isKnownRefundStatus(status: string): status is RefundStatusDto {
	return status in REFUND_STATUS_TONE;
}

// A refund's real status field is a bare string (see RefundResponseDto) —
// these take whatever the backend actually sent and degrade gracefully for
// a value outside the 5 known ones, instead of a Record index throwing or
// silently returning undefined.
export function refundStatusTone(
	status: string,
): "success" | "warning" | "danger" | "neutral" {
	return isKnownRefundStatus(status) ? REFUND_STATUS_TONE[status] : "neutral";
}

export function refundStatusLabel(status: string): string {
	return isKnownRefundStatus(status) ? REFUND_STATUS_LABEL[status] : status;
}

export const invoicesListQueryOptions = () =>
	queryOptions({
		queryKey: ["invoices"],
		queryFn: () => listInvoiceSummaries(),
	});

export const invoicesListPageQueryOptions = (params: {
	status?: InvoiceStatusDto;
	q?: string;
	page: number;
	size?: PageSize;
}) =>
	queryOptions({
		queryKey: ["invoices", "list", params],
		queryFn: () =>
			searchInvoiceSummaries({
				data: {
					status: params.status,
					q: params.q,
					page: params.page - 1,
					size: params.size ?? INVOICES_PAGE_SIZE,
				},
			}),
		placeholderData: keepPreviousData,
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
