import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import ThemeToggle from "#/components/ThemeToggle.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { SidebarTrigger } from "#/components/ui/sidebar.tsx";
import { cn } from "#/lib/utils.ts";

const sections = [
	{ prefix: "/overview", href: "/overview", label: "Overview" },
	{ prefix: "/plans", href: "/plans", label: "Plans" },
	{ prefix: "/subscriptions", href: "/subscriptions", label: "Subscriptions" },
	{ prefix: "/invoices", href: "/invoices", label: "Invoices" },
	{ prefix: "/customers", href: "/customers", label: "Customers" },
	{ prefix: "/revenue", href: "/revenue", label: "Revenue" },
	{ prefix: "/webhooks", href: "/webhooks", label: "Webhooks" },
	{ prefix: "/events", href: "/events", label: "Events" },
	{ prefix: "/settings", href: "/settings/account", label: "Settings" },
] as const;

function currentSection(pathname: string) {
	return sections.find(
		(s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`),
	);
}

export function DashboardHeader() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 4);
		window.addEventListener("scroll", onScroll, { passive: true });
		onScroll();
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const section = currentSection(pathname);
	const rest = section
		? pathname.slice(section.prefix.length).replace(/^\//, "")
		: "";

	return (
		<header
			className={cn(
				"sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-(--surface-1)/90 px-4 backdrop-blur-xl transition-shadow duration-200",
				scrolled
					? "border-(--line) shadow-[0_1px_0_0_var(--line)]"
					: "border-(--line)/60",
			)}
		>
			<SidebarTrigger className="-ml-1 text-(--ink-3) hover:text-(--ink)" />
			<Separator orientation="vertical" className="my-3" />
			{section && (
				<div className="flex min-w-0 items-center gap-1.5 text-sm">
					{rest ? (
						<Link
							to={section.href}
							className="font-medium text-(--ink-2) no-underline hover:text-(--ink)"
						>
							{section.label}
						</Link>
					) : (
						<span className="font-medium text-(--ink)">{section.label}</span>
					)}
					{rest && (
						<>
							<span className="text-(--ink-3)">/</span>
							<span className="truncate font-heading text-xs text-(--ink-3)">
								{rest}
							</span>
						</>
					)}
				</div>
			)}
			<div className="ml-auto flex items-center gap-2">
				<ThemeToggle />
			</div>
		</header>
	);
}
