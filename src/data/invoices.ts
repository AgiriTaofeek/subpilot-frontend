import { subscriptions } from "#/data/subscriptions.ts";

export type InvoiceStatus = "paid" | "open" | "void" | "failed";

export interface Invoice {
	id: string;
	number: string;
	subscriptionId: string;
	customerName: string;
	customerEmail: string;
	status: InvoiceStatus;
	grossKobo: number;
	feeKobo: number;
	netKobo: number;
	periodStart: string;
	periodEnd: string;
	createdAt: string;
}

export const invoiceStatusTone: Record<
	InvoiceStatus,
	"success" | "warning" | "danger" | "neutral"
> = {
	paid: "success",
	open: "warning",
	failed: "danger",
	void: "neutral",
};

export const invoiceStatusLabel: Record<InvoiceStatus, string> = {
	paid: "Paid",
	open: "Open",
	failed: "Failed",
	void: "Void",
};

function customerFor(subscriptionId: string) {
	const sub = subscriptions.find((s) => s.id === subscriptionId);
	return {
		name: sub?.customerName ?? "Unknown customer",
		email: sub?.customerEmail ?? "unknown@example.com",
	};
}

function computeFee(grossKobo: number): number {
	return Math.round(grossKobo * 0.015) + 10_000;
}

function billingPeriod(createdAt: string): {
	periodStart: string;
	periodEnd: string;
} {
	const end = new Date(createdAt);
	const start = new Date(end);
	start.setDate(start.getDate() - 30);
	return { periodStart: start.toISOString(), periodEnd: end.toISOString() };
}

function paidInvoice(
	id: string,
	number: string,
	subscriptionId: string,
	grossKobo: number,
	createdAt: string,
): Invoice {
	const { name, email } = customerFor(subscriptionId);
	const feeKobo = computeFee(grossKobo);
	return {
		id,
		number,
		subscriptionId,
		customerName: name,
		customerEmail: email,
		status: "paid",
		grossKobo,
		feeKobo,
		netKobo: grossKobo - feeKobo,
		...billingPeriod(createdAt),
		createdAt,
	};
}

function unpaidInvoice(
	id: string,
	number: string,
	subscriptionId: string,
	grossKobo: number,
	createdAt: string,
	status: "open" | "void" | "failed",
): Invoice {
	const { name, email } = customerFor(subscriptionId);
	return {
		id,
		number,
		subscriptionId,
		customerName: name,
		customerEmail: email,
		status,
		grossKobo,
		feeKobo: 0,
		netKobo: 0,
		...billingPeriod(createdAt),
		createdAt,
	};
}

export const invoices: Invoice[] = [
	paidInvoice(
		"inv_01",
		"INV-0001",
		"sub_01",
		500_000,
		"2026-06-02T09:00:00.000Z",
	),
	paidInvoice(
		"inv_02",
		"INV-0002",
		"sub_03",
		1_200_000,
		"2026-06-15T09:00:00.000Z",
	),
	paidInvoice(
		"inv_03",
		"INV-0003",
		"sub_06",
		50_000,
		"2026-06-01T09:00:00.000Z",
	),
	paidInvoice(
		"inv_04",
		"INV-0004",
		"sub_07",
		5_000_000,
		"2026-05-01T09:00:00.000Z",
	),
	paidInvoice(
		"inv_05",
		"INV-0005",
		"sub_11",
		500_000,
		"2026-06-04T09:00:00.000Z",
	),
	paidInvoice(
		"inv_06",
		"INV-0006",
		"sub_01",
		500_000,
		"2026-05-02T09:00:00.000Z",
	),
	paidInvoice(
		"inv_07",
		"INV-0007",
		"sub_03",
		1_200_000,
		"2026-05-15T09:00:00.000Z",
	),
	unpaidInvoice(
		"inv_08",
		"INV-0008",
		"sub_02",
		150_000,
		"2026-06-28T09:00:00.000Z",
		"failed",
	),
	unpaidInvoice(
		"inv_09",
		"INV-0009",
		"sub_05",
		500_000,
		"2026-06-30T09:00:00.000Z",
		"failed",
	),
	unpaidInvoice(
		"inv_10",
		"INV-0010",
		"sub_13",
		50_000,
		"2026-06-29T09:00:00.000Z",
		"failed",
	),
	unpaidInvoice(
		"inv_11",
		"INV-0011",
		"sub_09",
		150_000,
		"2026-06-19T09:00:00.000Z",
		"open",
	),
	unpaidInvoice(
		"inv_12",
		"INV-0012",
		"sub_08",
		12_000_000,
		"2026-06-29T09:00:00.000Z",
		"open",
	),
	unpaidInvoice(
		"inv_13",
		"INV-0013",
		"sub_10",
		1_200_000,
		"2026-05-19T09:00:00.000Z",
		"void",
	),
	paidInvoice(
		"inv_14",
		"INV-0014",
		"sub_04",
		250_000,
		"2026-06-30T09:00:00.000Z",
	),
	paidInvoice(
		"inv_15",
		"INV-0015",
		"sub_12",
		250_000,
		"2026-06-29T09:00:00.000Z",
	),
];
