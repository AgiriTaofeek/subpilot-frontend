import { CodeBlock } from "#/components/docs/code-block.tsx";
import { MethodBadge } from "#/components/docs/method-badge.tsx";
import type { ApiEndpoint } from "#/data/api-docs.ts";

export function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
	const hasExamples = endpoint.requestExample || endpoint.responseExample;

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-(--line) bg-(--surface-1) p-5">
			<div className="flex flex-wrap items-center gap-3">
				<MethodBadge method={endpoint.method} />
				<code className="font-heading text-sm text-(--ink)">
					{endpoint.path}
				</code>
			</div>
			<div className="flex flex-col gap-1">
				<p className="m-0 text-sm font-semibold text-(--ink)">
					{endpoint.summary}
				</p>
				{endpoint.description ? (
					<p className="m-0 text-sm leading-6 text-(--ink-2)">
						{endpoint.description}
					</p>
				) : null}
			</div>
			{hasExamples ? (
				<div className="grid gap-3 lg:grid-cols-2">
					{endpoint.requestExample ? (
						<CodeBlock label="Request body" code={endpoint.requestExample} />
					) : null}
					{endpoint.responseExample ? (
						<CodeBlock label="Response" code={endpoint.responseExample} />
					) : null}
				</div>
			) : null}
		</div>
	);
}
