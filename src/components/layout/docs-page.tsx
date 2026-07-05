import { Link } from "@tanstack/react-router";

import { CodeBlock } from "#/components/docs/code-block.tsx";
import { DocsSidebarNav } from "#/components/docs/docs-sidebar-nav.tsx";
import { ResourceGroupSection } from "#/components/docs/resource-group-section.tsx";
import { WebhookEventsList } from "#/components/docs/webhook-events-list.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	apiBaseUrl,
	apiResourceGroups,
	webhookEvents,
} from "#/data/api-docs.ts";

const navSections = [
	{ id: "authentication", label: "Authentication" },
	...apiResourceGroups.map((group) => ({ id: group.id, label: group.title })),
	{ id: "webhook-events", label: "Webhook events" },
];

export default function DocsPage() {
	return (
		<div className="px-6">
			<div className="page-wrap flex flex-col gap-10 py-12 sm:py-16">
				<div className="flex flex-col gap-4">
					<p className="island-kicker m-0">Developer docs</p>
					<h1 className="text-4xl font-semibold tracking-tight text-(--ink) sm:text-5xl">
						API reference
					</h1>
					<p className="m-0 max-w-2xl text-base leading-7 text-(--ink-2) sm:text-lg">
						Everything your backend needs to integrate SubPilot directly —
						plans, subscriptions, invoices, and real-time webhooks. Generate an
						API key from your dashboard settings to get started.
					</p>
					<div>
						<Button asChild size="lg">
							<Link to="/auth/signup">Get an API key</Link>
						</Button>
					</div>
				</div>

				<div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-10">
					<DocsSidebarNav sections={navSections} />

					<div className="flex min-w-0 flex-1 flex-col gap-14">
						<section
							id="authentication"
							className="flex scroll-mt-24 flex-col gap-4"
						>
							<div className="flex max-w-2xl flex-col gap-2">
								<h2 className="text-2xl font-semibold tracking-tight text-(--ink)">
									Authentication
								</h2>
								<p className="m-0 text-sm leading-6 text-(--ink-2)">
									Authenticate by sending your API key as a bearer token. Every
									request must be made over HTTPS to the base URL below.
								</p>
							</div>
							<div className="grid gap-3 lg:grid-cols-2">
								<CodeBlock label="Base URL" code={apiBaseUrl} />
								<CodeBlock
									label="Header"
									code={`Authorization: Bearer sk_live_subpilot_production_****`}
								/>
							</div>
							<CodeBlock
								label="Example request"
								code={`curl ${apiBaseUrl}/v1/plans \\
  -H "Authorization: Bearer sk_live_subpilot_production_****"`}
							/>
							<p className="m-0 text-xs leading-6 text-(--ink-3)">
								API keys are created and revoked from your dashboard under
								Settings → API keys (see the "API keys" section below) — a raw
								key is only ever shown once, at creation.
							</p>
						</section>

						{apiResourceGroups.map((group) => (
							<ResourceGroupSection key={group.id} group={group} />
						))}

						<section
							id="webhook-events"
							className="flex scroll-mt-24 flex-col gap-5"
						>
							<div className="flex max-w-2xl flex-col gap-2">
								<h2 className="text-2xl font-semibold tracking-tight text-(--ink)">
									Webhook events
								</h2>
								<p className="m-0 text-sm leading-6 text-(--ink-2)">
									Every delivery shares the same envelope and is signed so you
									can verify it came from SubPilot.
								</p>
							</div>
							<div className="grid gap-3 lg:grid-cols-2">
								<CodeBlock
									label="Envelope (all events)"
									code={`{
  "id": "01JXYZ...",
  "type": "subscription.activated",
  "merchantId": "01JABC...",
  "resourceType": "subscription",
  "resourceId": "01JDEF...",
  "subscriptionId": "01JDEF...",
  "createdAt": "2025-06-28T12:00:00Z",
  "data": { /* event-specific payload */ }
}`}
								/>
								<CodeBlock
									label="Headers"
									code={`X-SubPilot-Signature: sha256=<hmac-hex>
X-SubPilot-Timestamp: 2025-06-28T12:00:00Z
Content-Type: application/json`}
								/>
							</div>
							<WebhookEventsList events={webhookEvents} />
						</section>
					</div>
				</div>
			</div>
		</div>
	);
}
