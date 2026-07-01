export type PaymentAttemptStatus = "succeeded" | "failed" | "retrying";

export interface PaymentAttempt {
	invoiceId: string;
	attemptNumber: number;
	timestamp: string;
	status: PaymentAttemptStatus;
	reference: string;
	failureReason: string | null;
}

export const paymentAttempts: PaymentAttempt[] = [
	// Paid invoices — one successful attempt each.
	{
		invoiceId: "inv_01",
		attemptNumber: 1,
		timestamp: "2026-06-02T09:00:12.000Z",
		status: "succeeded",
		reference: "nomba_ref_a1b2c3",
		failureReason: null,
	},
	{
		invoiceId: "inv_02",
		attemptNumber: 1,
		timestamp: "2026-06-15T09:00:08.000Z",
		status: "succeeded",
		reference: "nomba_ref_d4e5f6",
		failureReason: null,
	},
	// Failed invoices — retry history.
	{
		invoiceId: "inv_08",
		attemptNumber: 1,
		timestamp: "2026-06-28T09:05:00.000Z",
		status: "failed",
		reference: "nomba_ref_g7h8i9",
		failureReason: "Card declined",
	},
	{
		invoiceId: "inv_08",
		attemptNumber: 2,
		timestamp: "2026-06-29T14:20:00.000Z",
		status: "retrying",
		reference: "nomba_ref_j1k2l3",
		failureReason: "Insufficient funds",
	},
	{
		invoiceId: "inv_09",
		attemptNumber: 1,
		timestamp: "2026-06-30T09:00:00.000Z",
		status: "failed",
		reference: "nomba_ref_m4n5o6",
		failureReason: "Insufficient funds",
	},
	{
		invoiceId: "inv_09",
		attemptNumber: 2,
		timestamp: "2026-06-30T16:40:00.000Z",
		status: "retrying",
		reference: "nomba_ref_p7q8r9",
		failureReason: "Insufficient funds",
	},
	// Open invoice — no attempts yet.
	// Void invoice — attempt was made before voiding.
	{
		invoiceId: "inv_13",
		attemptNumber: 1,
		timestamp: "2026-05-19T09:05:00.000Z",
		status: "failed",
		reference: "nomba_ref_s1t2u3",
		failureReason: "Card expired",
	},
];

export function paymentAttemptsFor(invoiceId: string): PaymentAttempt[] {
	return paymentAttempts
		.filter((a) => a.invoiceId === invoiceId)
		.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);
}
