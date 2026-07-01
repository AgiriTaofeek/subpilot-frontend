const NGN_FORMATTER = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 0,
});

export function formatNGN(amountKobo: number): string {
	return NGN_FORMATTER.format(Math.round(amountKobo / 100));
}
