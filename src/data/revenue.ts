export type RevenueWindow = "7d" | "30d" | "90d";

export interface DailyRevenue {
	date: string;
	grossKobo: number;
	netKobo: number;
}

const HISTORY_DAYS = 180;
const TODAY = new Date("2026-07-01T00:00:00.000Z");

function generateDailyRevenue(): DailyRevenue[] {
	const days: DailyRevenue[] = [];
	for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
		const date = new Date(TODAY);
		date.setUTCDate(date.getUTCDate() - i);
		const dayOfWeek = date.getUTCDay();
		const weekdayMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.55 : 1;
		const trend = 1 + (HISTORY_DAYS - i) * 0.0025;
		const wave = 1 + 0.12 * Math.sin(i / 6);
		const grossKobo =
			Math.round((1_800_000 * weekdayMultiplier * trend * wave) / 1000) * 1000;
		const feeKobo = Math.round(grossKobo * 0.015) + 10_000;
		days.push({
			date: date.toISOString().slice(0, 10),
			grossKobo,
			netKobo: grossKobo - feeKobo,
		});
	}
	return days;
}

export const dailyRevenue: DailyRevenue[] = generateDailyRevenue();

function windowDays(window: RevenueWindow): number {
	return window === "7d" ? 7 : window === "30d" ? 30 : 90;
}

export function revenueForWindow(window: RevenueWindow): DailyRevenue[] {
	return dailyRevenue.slice(-windowDays(window));
}

export function priorRevenueForWindow(window: RevenueWindow): DailyRevenue[] {
	const n = windowDays(window);
	return dailyRevenue.slice(-(n * 2), -n);
}

export function sumGross(days: DailyRevenue[]): number {
	return days.reduce((sum, d) => sum + d.grossKobo, 0);
}

export function sumNet(days: DailyRevenue[]): number {
	return days.reduce((sum, d) => sum + d.netKobo, 0);
}

export function sumFee(days: DailyRevenue[]): number {
	return sumGross(days) - sumNet(days);
}
