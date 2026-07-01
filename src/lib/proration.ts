const BILLING_CYCLE_DAYS = 30;

export function calculateProration(
	currentAmountKobo: number,
	nextAmountKobo: number,
	periodEndIso: string,
): { creditKobo: number; chargeKobo: number } {
	const now = Date.now();
	const end = new Date(periodEndIso).getTime();
	const remainingDays = Math.max(
		0,
		Math.min(
			BILLING_CYCLE_DAYS,
			Math.round((end - now) / (1000 * 60 * 60 * 24)),
		),
	);
	const dailyCurrent = currentAmountKobo / BILLING_CYCLE_DAYS;
	const dailyNext = nextAmountKobo / BILLING_CYCLE_DAYS;
	const net = Math.round(
		dailyNext * remainingDays - dailyCurrent * remainingDays,
	);
	return {
		creditKobo: net < 0 ? Math.abs(net) : 0,
		chargeKobo: net > 0 ? net : 0,
	};
}
