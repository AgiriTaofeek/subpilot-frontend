import ThemeToggle from "#/components/ThemeToggle.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { SidebarTrigger } from "#/components/ui/sidebar.tsx";

export function InternalHeader() {
	return (
		<header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-destructive/20 bg-(--surface-1)/90 px-4 backdrop-blur-xl">
			<SidebarTrigger className="-ml-1 text-(--ink-3) hover:text-(--ink)" />
			<Separator orientation="vertical" className="my-3" />
			<span className="text-sm font-medium text-destructive">
				Internal — staff only
			</span>
			<div className="ml-auto flex items-center gap-2">
				<ThemeToggle />
			</div>
		</header>
	);
}
