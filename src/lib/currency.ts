// en-US's CLDR data has no ₦ glyph mapped for NGN, so it renders the plain
// ISO code ("NGN 1,250") instead of the symbol. en-NG resolves to "₦1,250" —
// also the more correct locale for this app's target market regardless.
const NGN_FORMATTER = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 0,
});

export function formatNGN(amountKobo: number): string {
	// backendRequest no longer throws on a responseSchema mismatch (see
	// backend.ts), so a malformed amount from Java (null/a string/missing)
	// can reach here as a value TypeScript believes is `number` but isn't.
	// Intl.NumberFormat happily renders NaN as the literal string "NaN" —
	// silently showing a broken amount in a merchant-facing payments table
	// is worse than a placeholder that's honestly not a number.
	if (!Number.isFinite(amountKobo)) return "—";
	return NGN_FORMATTER.format(Math.round(amountKobo / 100));
}
