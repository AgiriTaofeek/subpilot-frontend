export function CodeBlock({ label, code }: { label?: string; code: string }) {
	return (
		<div className="overflow-hidden rounded-xl border border-(--surface-invert-edge) bg-(--surface-invert)">
			{label ? (
				<div className="border-b border-(--surface-invert-edge) px-4 py-2">
					<p className="island-kicker m-0 text-[0.60rem] opacity-70">{label}</p>
				</div>
			) : null}
			<pre className="overflow-x-auto p-4 text-xs leading-6">
				<code className="font-heading text-(--ink-invert-2)">{code}</code>
			</pre>
		</div>
	);
}
