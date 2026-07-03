// en-US's CLDR data has no ₦ glyph mapped for NGN, so it renders the plain
// ISO code ("NGN 1,250") instead of the symbol. en-NG resolves to "₦1,250" —
// also the more correct locale for this app's target market regardless.
const NGN_FORMATTER = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 0,
});

export function formatNGN(amountKobo: number): string {
	return NGN_FORMATTER.format(Math.round(amountKobo / 100));
}
