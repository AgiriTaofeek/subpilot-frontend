import { queryOptions } from "@tanstack/react-query";

import type { InvoiceSummary } from "#/data/invoices.ts";
import { getFeeRate, getFeeSummary } from "#/lib/api/revenue.ts";

export type RevenueWindow = "7d" | "30d" | "90d";

export interface DailyRevenue {
	date: string;
	grossKobo: number;
	netKobo: number;
}

function windowDays(window: RevenueWindow): number {
	return window === "7d" ? 7 : window === "30d" ? 30 : 90;
}

function windowStartDate(window: RevenueWindow): Date {
	const days = windowDays(window);
	const start = new Date();
	start.setUTCHours(0, 0, 0, 0);
	start.setUTCDate(start.getUTCDate() - (days - 1));
	return start;
}

export const revenueSummaryQueryOptions = (window: RevenueWindow) =>
	queryOptions({
		queryKey: ["revenue", "summary", window],
		queryFn: async () => {
			const days = windowDays(window);
			const [current, combined, rate] = await Promise.all([
				getFeeSummary({ data: { days } }),
				getFeeSummary({ data: { days: days * 2 } }),
				getFeeRate(),
			]);

			return {
				current,
				prior: {
					totalGrossAmount:
						combined.totalGrossAmount - current.totalGrossAmount,
					totalFeeAmount: combined.totalFeeAmount - current.totalFeeAmount,
					totalNetAmount: combined.totalNetAmount - current.totalNetAmount,
				},
				rate,
			};
		},
	});

export function ledgerInvoicesForWindow(
	allInvoices: InvoiceSummary[],
	window: RevenueWindow,
): InvoiceSummary[] {
	const start = windowStartDate(window).toISOString().slice(0, 10);
	return allInvoices
		.filter((invoice) => invoice.createdAt.slice(0, 10) >= start)
		.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
}

export function dailyChartForWindow(
	allInvoices: InvoiceSummary[],
	window: RevenueWindow,
): DailyRevenue[] {
	const days = windowDays(window);
	const start = windowStartDate(window);

	const byDay = new Map<string, DailyRevenue>();
	for (let i = 0; i < days; i++) {
		const date = new Date(start);
		date.setUTCDate(date.getUTCDate() + i);
		const key = date.toISOString().slice(0, 10);
		byDay.set(key, { date: key, grossKobo: 0, netKobo: 0 });
	}

	for (const invoice of allInvoices) {
		const key = invoice.createdAt.slice(0, 10);
		const bucket = byDay.get(key);
		if (!bucket) continue;
		bucket.grossKobo += invoice.grossKobo;
		if (invoice.status === "paid") bucket.netKobo += invoice.netKobo;
	}

	return Array.from(byDay.values());
}
