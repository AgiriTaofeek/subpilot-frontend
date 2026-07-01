import { type Customer, customers } from "#/data/customers.ts";
import type { Plan } from "#/data/plans.ts";
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

// No real backend exists in this demo — checkout registers the new
// subscriber directly into the in-memory mock arrays so the
// checkout -> return -> portal loop works end-to-end for a brand-new
// subscriber, not just the pre-seeded demo tokens above.
export function registerCheckoutSession(input: {
	fullName: string;
	email: string;
	phone: string;
	plan: Plan;
}): string {
	const now = new Date().toISOString();
	const suffix = Date.now().toString(36);
	const subscriptionId = `sub_checkout_${suffix}`;
	const token = `checkout-${suffix}`;

	const periodEnd = new Date();
	periodEnd.setDate(
		periodEnd.getDate() +
			(input.plan.trialDays > 0 ? input.plan.trialDays : 30),
	);

	const subscription: Subscription = {
		id: subscriptionId,
		customerName: input.fullName,
		customerEmail: input.email,
		planId: input.plan.id,
		status: input.plan.trialDays > 0 ? "trialing" : "active",
		amountKobo: input.plan.amountKobo,
		nextBillingDate: periodEnd.toISOString(),
		currentPeriodEnd: periodEnd.toISOString(),
		updatedAt: now,
		createdAt: now,
	};

	const customer: Customer = {
		id: `cus_checkout_${suffix}`,
		name: input.fullName,
		email: input.email,
		phone: input.phone,
		cardBrand: "Visa",
		cardLast4: "4242",
		cardExpiry: "12/29",
		createdAt: now,
	};

	subscriptions.push(subscription);
	customers.push(customer);
	portalSessions.push({ token, subscriptionId });

	return token;
}
