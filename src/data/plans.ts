export type PlanStatus = "draft" | "published" | "archived";

export type ProrationPolicy = "none" | "credit" | "charge";

export type PlanInterval =
	| { kind: "monthly" }
	| { kind: "annual" }
	| { kind: "weekly" }
	| { kind: "custom"; count: number; unit: "day" | "week" | "month" };

export interface Plan {
	id: string;
	name: string;
	description?: string;
	amountKobo: number;
	interval: PlanInterval;
	trialDays: number;
	proration: ProrationPolicy;
	status: PlanStatus;
	merchantSlug: string;
	planSlug: string;
	createdAt: string;
}

export const statusTone: Record<PlanStatus, "brand" | "neutral"> = {
	published: "brand",
	draft: "neutral",
	archived: "neutral",
};

export const prorationLabels: Record<ProrationPolicy, string> = {
	none: "None — no adjustment for mid-cycle changes.",
	credit: "Credit — unused days refunded to next invoice.",
	charge: "Charge — subscriber pays for remaining days immediately.",
};

export function formatInterval(interval: PlanInterval): string {
	switch (interval.kind) {
		case "monthly":
			return "Monthly";
		case "annual":
			return "Yearly";
		case "weekly":
			return "Weekly";
		case "custom": {
			const unit = interval.count === 1 ? interval.unit : `${interval.unit}s`;
			return `Every ${interval.count} ${unit}`;
		}
	}
}

export function checkoutUrl(plan: Plan): string {
	return `/pay/${plan.merchantSlug}/${plan.planSlug}`;
}

export function resolvePublicPlan(
	merchantSlug: string,
	planSlug: string,
): Plan | null {
	const plan = plans.find(
		(p) => p.merchantSlug === merchantSlug && p.planSlug === planSlug,
	);
	if (!plan || plan.status !== "published") return null;
	return plan;
}

export const merchantSlug = "acme-corp";

export const plans: Plan[] = [
	{
		id: "plan_01",
		name: "Growth",
		description: "For teams scaling past their first few hundred customers.",
		amountKobo: 500_000,
		interval: { kind: "monthly" },
		trialDays: 14,
		proration: "credit",
		status: "published",
		merchantSlug,
		planSlug: "growth-plan",
		createdAt: "2026-06-18T09:12:00.000Z",
	},
	{
		id: "plan_02",
		name: "Starter",
		description: "Everything you need to launch recurring billing.",
		amountKobo: 150_000,
		interval: { kind: "monthly" },
		trialDays: 7,
		proration: "none",
		status: "published",
		merchantSlug,
		planSlug: "starter-plan",
		createdAt: "2026-06-10T14:30:00.000Z",
	},
	{
		id: "plan_03",
		name: "Enterprise",
		description: "Priority support and custom onboarding for large teams.",
		amountKobo: 5_000_000,
		interval: { kind: "annual" },
		trialDays: 0,
		proration: "charge",
		status: "published",
		merchantSlug,
		planSlug: "enterprise-plan",
		createdAt: "2026-05-28T11:00:00.000Z",
	},
	{
		id: "plan_04",
		name: "Growth (quarterly trial)",
		description: "Growth plan with an extended evaluation window.",
		amountKobo: 500_000,
		interval: { kind: "custom", count: 3, unit: "month" },
		trialDays: 30,
		proration: "credit",
		status: "draft",
		merchantSlug,
		planSlug: "growth-quarterly",
		createdAt: "2026-06-25T16:45:00.000Z",
	},
	{
		id: "plan_05",
		name: "Weekly Pass",
		description: "Short-term access billed weekly.",
		amountKobo: 25_000,
		interval: { kind: "weekly" },
		trialDays: 0,
		proration: "none",
		status: "draft",
		merchantSlug,
		planSlug: "weekly-pass",
		createdAt: "2026-06-05T08:00:00.000Z",
	},
	{
		id: "plan_06",
		name: "Legacy Basic",
		description: "Retired plan kept for existing subscribers only.",
		amountKobo: 100_000,
		interval: { kind: "monthly" },
		trialDays: 0,
		proration: "none",
		status: "archived",
		merchantSlug,
		planSlug: "legacy-basic",
		createdAt: "2025-11-02T10:15:00.000Z",
	},
	{
		id: "plan_07",
		name: "Team",
		description: "Shared billing for small teams, monthly.",
		amountKobo: 1_200_000,
		interval: { kind: "monthly" },
		trialDays: 14,
		proration: "credit",
		status: "published",
		merchantSlug,
		planSlug: "team-plan",
		createdAt: "2026-06-20T09:00:00.000Z",
	},
	{
		id: "plan_08",
		name: "Team (annual)",
		description: "Team plan billed yearly at a discount.",
		amountKobo: 12_000_000,
		interval: { kind: "annual" },
		trialDays: 14,
		proration: "credit",
		status: "published",
		merchantSlug,
		planSlug: "team-annual",
		createdAt: "2026-06-19T09:00:00.000Z",
	},
	{
		id: "plan_09",
		name: "Solo",
		description: "For individual operators getting started.",
		amountKobo: 250_000,
		interval: { kind: "monthly" },
		trialDays: 7,
		proration: "none",
		status: "published",
		merchantSlug,
		planSlug: "solo-plan",
		createdAt: "2026-06-15T09:00:00.000Z",
	},
	{
		id: "plan_10",
		name: "Solo (annual)",
		description: "Solo plan billed yearly at a discount.",
		amountKobo: 2_500_000,
		interval: { kind: "annual" },
		trialDays: 7,
		proration: "none",
		status: "draft",
		merchantSlug,
		planSlug: "solo-annual",
		createdAt: "2026-06-22T09:00:00.000Z",
	},
	{
		id: "plan_11",
		name: "Nonprofit",
		description: "Discounted pricing for registered nonprofits.",
		amountKobo: 50_000,
		interval: { kind: "monthly" },
		trialDays: 30,
		proration: "credit",
		status: "published",
		merchantSlug,
		planSlug: "nonprofit-plan",
		createdAt: "2026-06-12T09:00:00.000Z",
	},
	{
		id: "plan_12",
		name: "Legacy Pro",
		description: "Retired plan kept for existing subscribers only.",
		amountKobo: 300_000,
		interval: { kind: "monthly" },
		trialDays: 0,
		proration: "charge",
		status: "archived",
		merchantSlug,
		planSlug: "legacy-pro",
		createdAt: "2025-10-14T10:15:00.000Z",
	},
];
