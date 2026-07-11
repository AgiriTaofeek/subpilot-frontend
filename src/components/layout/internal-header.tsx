import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "#/components/layout/theme-toggle.tsx";
import { UserMenu } from "#/components/layout/user-menu.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { SidebarTrigger } from "#/components/ui/sidebar.tsx";
import { logoutInternalAdmin } from "#/lib/api/internal-auth.ts";
import type { InternalAdminSessionDto } from "#/types/api.ts";

// Ordered most-specific-prefix-first — "/internal" (Dashboard) would
// otherwise match every other section too, since they're all nested under
// it. find() takes the first match, so Dashboard has to be last.
const sections = [
	{
		prefix: "/internal/merchants",
		href: "/internal/merchants",
		label: "Merchants",
	},
	{ prefix: "/internal/refunds", href: "/internal/refunds", label: "Refunds" },
	{
		prefix: "/internal/analytics",
		href: "/internal/analytics",
		label: "Analytics",
	},
	{ prefix: "/internal/fees", href: "/internal/fees", label: "Fees" },
	{
		prefix: "/internal/audit-log",
		href: "/internal/audit-log",
		label: "Audit log",
	},
	{ prefix: "/internal", href: "/internal", label: "Dashboard" },
] as const;

function currentSection(pathname: string) {
	return sections.find(
		(s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`),
	);
}

export function InternalHeader({
	internalAdminSession,
}: {
	internalAdminSession: InternalAdminSessionDto;
}) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	function handleLogout() {
		if (isLoggingOut) return;
		setIsLoggingOut(true);
		toast.promise(
			logoutInternalAdmin().then(async () => {
				queryClient.clear();
				await navigate({ to: "/internal/login" });
			}),
			{
				loading: "Logging out…",
				success: "Logged out",
				error: (error) =>
					error instanceof Error ? error.message : "Couldn't log you out.",
				finally: () => setIsLoggingOut(false),
			},
		);
	}

	const section = currentSection(pathname);
	const rest = section
		? pathname.slice(section.prefix.length).replace(/^\//, "")
		: "";

	return (
		<header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-destructive/20 bg-(--surface-1)/90 px-4 backdrop-blur-xl">
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
							<span className="truncate text-(--ink-3)">{rest}</span>
						</>
					)}
				</div>
			)}
			<div className="ml-auto flex items-center gap-2">
				<ThemeToggle />
				<UserMenu
					name={internalAdminSession.displayName}
					subtitle={internalAdminSession.email}
					badge={internalAdminSession.role}
					onLogout={handleLogout}
					isLoggingOut={isLoggingOut}
					tone="destructive"
				/>
			</div>
		</header>
	);
}
