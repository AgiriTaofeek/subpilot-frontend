import { customers } from "#/data/customers.ts";
import { type Subscription, subscriptions } from "#/data/subscriptions.ts";

interface PortalSession {
	token: string;
	subscriptionId: string;
}

const portalSessions: PortalSession[] = [
	{ token: "demo-active", subscriptionId: "sub_01" },
	{ token: "demo-past-due", subscriptionId: "sub_02" },
	{ token: "demo-paused", subscriptionId: "sub_08" },
	{ token: "demo-scheduled-cancel", subscriptionId: "sub_14" },
	{ token: "demo-cancelled", subscriptionId: "sub_09" },
	{ token: "demo-expired", subscriptionId: "sub_10" },
	{ token: "demo-trial-empty", subscriptionId: "sub_15" },
	{ token: "demo-new-empty", subscriptionId: "sub_16" },
];

export interface PortalContext {
	subscription: Subscription;
	cardBrand: string;
	cardLast4: string;
}

export function resolvePortalToken(token: string): PortalContext | null {
	const session = portalSessions.find((s) => s.token === token);
	if (!session) return null;
	const subscription = subscriptions.find(
		(s) => s.id === session.subscriptionId,
	);
	if (!subscription) return null;
	const customer = customers.find(
		(c) => c.email === subscription.customerEmail,
	);
	return {
		subscription,
		cardBrand: customer?.cardBrand ?? "Card",
		cardLast4: customer?.cardLast4 ?? "0000",
	};
}

export const merchantDisplayName = "Acme Corp";
