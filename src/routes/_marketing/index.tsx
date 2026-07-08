import { createFileRoute } from "@tanstack/react-router";

import { MarketingHome } from "#/components/layout/marketing-home.tsx";

export const Route = createFileRoute("/_marketing/")({
	component: MarketingHome,
	head: () => ({
		meta: [
			{ title: "SubPilot | Recurring billing for Nomba" },
			{
				name: "description",
				content:
					"SubPilot gives Nomba teams recurring billing, proration, dunning, customer portal flows, and webhook-ready operational visibility.",
			},
		],
	}),
});
