import { queryOptions } from "@tanstack/react-query";

import { listAuditLogs } from "#/lib/api/audit-logs.ts";
import type { AuditActorTypeDto } from "#/types/api.ts";

export const auditActionGroups: Array<{ group: string; actions: string[] }> = [
	{
		group: "Plan",
		actions: [
			"plan.created",
			"plan.updated",
			"plan.published",
			"plan.archived",
		],
	},
	{
		group: "Subscription",
		actions: [
			"subscription.cancelled",
			"subscription.paused",
			"subscription.resumed",
			"subscription.plan_changed",
		],
	},
	{ group: "API keys", actions: ["api_key.created", "api_key.revoked"] },
	{ group: "User", actions: ["user.password_changed"] },
	{
		group: "Webhooks",
		actions: ["webhook_endpoint.created", "webhook_endpoint.deleted"],
	},
	{
		group: "Dunning",
		actions: [
			"dunning_campaign.updated",
			"dunning_step.created",
			"dunning_step.updated",
			"dunning_step.deleted",
		],
	},
	{ group: "Refunds", actions: ["refund.initiated"] },
	{ group: "Payouts", actions: ["payout.triggered"] },
];

export const auditActorTypeLabel: Record<AuditActorTypeDto, string> = {
	user: "User",
	api_key: "API key",
};

export const auditLogsQueryOptions = () =>
	queryOptions({
		queryKey: ["audit-logs"],
		queryFn: () => listAuditLogs({ data: {} }),
	});

export function parseSnapshot(snapshot: string | null): unknown {
	if (!snapshot) return null;
	try {
		return JSON.parse(snapshot);
	} catch {
		return snapshot;
	}
}
