import { EndpointCard } from "#/components/docs/endpoint-card.tsx";
import type { ApiResourceGroup } from "#/data/api-docs.ts";

export function ResourceGroupSection({ group }: { group: ApiResourceGroup }) {
	return (
		<section id={group.id} className="flex scroll-mt-24 flex-col gap-5">
			<div className="flex max-w-2xl flex-col gap-2">
				<h2 className="text-2xl font-semibold tracking-tight text-(--ink)">
					{group.title}
				</h2>
				<p className="m-0 text-sm leading-6 text-(--ink-2)">
					{group.description}
				</p>
			</div>
			<div className="flex flex-col gap-3">
				{group.endpoints.map((endpoint) => (
					<EndpointCard
						key={`${endpoint.method} ${endpoint.path}`}
						endpoint={endpoint}
					/>
				))}
			</div>
		</section>
	);
}
