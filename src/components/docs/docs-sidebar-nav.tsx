export interface DocsNavSection {
	id: string;
	label: string;
}

export function DocsSidebarNav({ sections }: { sections: DocsNavSection[] }) {
	return (
		<nav className="sticky top-24 hidden max-h-[calc(100vh-7rem)] w-48 shrink-0 flex-col gap-1 overflow-y-auto lg:flex">
			{sections.map((section) => (
				<a
					key={section.id}
					href={`#${section.id}`}
					className="rounded-lg px-3 py-1.5 text-sm text-(--ink-2) no-underline hover:bg-(--surface-2) hover:text-(--ink)"
				>
					{section.label}
				</a>
			))}
		</nav>
	);
}
