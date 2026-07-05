import { CodeBlock } from "#/components/docs/code-block.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import type { WebhookEventDef } from "#/data/api-docs.ts";

function groupByCategory(events: WebhookEventDef[]) {
	const groups = new Map<string, WebhookEventDef[]>();
	for (const event of events) {
		const existing = groups.get(event.category) ?? [];
		existing.push(event);
		groups.set(event.category, existing);
	}
	return [...groups.entries()];
}

export function WebhookEventsList({ events }: { events: WebhookEventDef[] }) {
	return (
		<div className="flex flex-col gap-6">
			{groupByCategory(events).map(([category, categoryEvents]) => (
				<div key={category} className="flex flex-col gap-3">
					<p className="island-kicker m-0">{category}</p>
					<div className="flex flex-col gap-3">
						{categoryEvents.map((event) => (
							<div
								key={event.type}
								className="flex flex-col gap-3 rounded-2xl border border-(--line) bg-(--surface-1) p-5"
							>
								<div className="flex flex-wrap items-center gap-2">
									<code className="font-heading text-sm text-(--ink)">
										{event.type}
									</code>
									{event.status === "pending" ? (
										<StatusBadge tone="neutral" className="text-[0.6rem]">
											Backend pending
										</StatusBadge>
									) : null}
								</div>
								<p className="m-0 text-sm leading-6 text-(--ink-2)">
									{event.description}
								</p>
								<CodeBlock code={event.payloadExample} />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
