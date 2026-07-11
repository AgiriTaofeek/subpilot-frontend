// en-US's CLDR data has no ₦ glyph mapped for NGN, so it renders the plain
// ISO code ("NGN 1,250") instead of the symbol. en-NG resolves to "₦1,250" —
// also the more correct locale for this app's target market regardless.
//
// Fixed at 2 fraction digits (not the Intl default, which varies by
// currency): kobo is NGN's minor unit, so amountKobo/100 always has at most
// 2 decimal digits — this never rounds away real precision, it just always
// renders it. Proration (a ₦5,000/mo plan prorated for 17 of 30 days =
// 283,333.33 kobo) and bps-based fees routinely produce amounts that aren't
// whole Naira; a merchant reconciling an invoice against a bank statement
// needs to see the exact kobo, not a value rounded to the nearest Naira.
const NGN_FORMATTER = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function formatNGN(amountKobo: number): string {
	// backendRequest no longer throws on a responseSchema mismatch (see
	// backend.ts), so a malformed amount from Java (null/a string/missing)
	// can reach here as a value TypeScript believes is `number` but isn't.
	// Intl.NumberFormat happily renders NaN as the literal string "NaN" —
	// silently showing a broken amount in a merchant-facing payments table
	// is worse than a placeholder that's honestly not a number.
	if (!Number.isFinite(amountKobo)) return "—";
	return NGN_FORMATTER.format(amountKobo / 100);
}
