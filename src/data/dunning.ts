export type DunningAttemptStatus = "failed" | "retrying" | "succeeded";

export interface DunningAttempt {
	subscriptionId: string;
	attemptNumber: number;
	timestamp: string;
	status: DunningAttemptStatus;
	failureReason: string | null;
}

export const dunningAttempts: DunningAttempt[] = [
	{
		subscriptionId: "sub_02",
		attemptNumber: 1,
		timestamp: "2026-06-28T09:05:00.000Z",
		status: "failed",
		failureReason: "Card declined",
	},
	{
		subscriptionId: "sub_02",
		attemptNumber: 2,
		timestamp: "2026-06-29T14:20:00.000Z",
		status: "retrying",
		failureReason: "Insufficient funds",
	},
	{
		subscriptionId: "sub_05",
		attemptNumber: 1,
		timestamp: "2026-06-30T09:00:00.000Z",
		status: "failed",
		failureReason: "Insufficient funds",
	},
	{
		subscriptionId: "sub_05",
		attemptNumber: 2,
		timestamp: "2026-06-30T16:40:00.000Z",
		status: "retrying",
		failureReason: "Insufficient funds",
	},
	{
		subscriptionId: "sub_13",
		attemptNumber: 1,
		timestamp: "2026-06-29T09:00:00.000Z",
		status: "failed",
		failureReason: "Card expired",
	},
	{
		subscriptionId: "sub_13",
		attemptNumber: 2,
		timestamp: "2026-06-30T08:00:00.000Z",
		status: "retrying",
		failureReason: "Card expired",
	},
];

export function dunningAttemptsFor(subscriptionId: string): DunningAttempt[] {
	return dunningAttempts
		.filter((a) => a.subscriptionId === subscriptionId)
		.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);
}
