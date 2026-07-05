import { createFileRoute } from "@tanstack/react-router";

import DocsPage from "#/components/layout/docs-page.tsx";

export const Route = createFileRoute("/_marketing/docs")({
	component: DocsPage,
	head: () => ({
		meta: [
			{ title: "API reference | SubPilot" },
			{
				name: "description",
				content:
					"Integrate SubPilot directly from your own backend — plans, subscriptions, invoices, and real-time webhooks, authenticated with an API key.",
			},
		],
	}),
});
