import {
	BuildingsIcon,
	ChartLineUpIcon,
	ClipboardTextIcon,
	CurrencyCircleDollarIcon,
	ReceiptIcon,
	SquaresFourIcon,
} from "@phosphor-icons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "#/components/ui/sidebar.tsx";
import type { InternalAdminSessionDto } from "#/types/api.ts";

const navItems = [
	{
		label: "Dashboard",
		href: "/internal",
		icon: SquaresFourIcon,
		activePrefix: "/internal",
		superAdminOnly: false,
	},
	{
		label: "Merchants",
		href: "/internal/merchants",
		icon: BuildingsIcon,
		activePrefix: "/internal/merchants",
		superAdminOnly: false,
	},
	{
		label: "Refunds",
		href: "/internal/refunds",
		icon: ReceiptIcon,
		activePrefix: "/internal/refunds",
		superAdminOnly: true,
	},
	{
		label: "Analytics",
		href: "/internal/analytics",
		icon: ChartLineUpIcon,
		activePrefix: "/internal/analytics",
		superAdminOnly: true,
	},
	{
		label: "Fees",
		href: "/internal/fees",
		icon: CurrencyCircleDollarIcon,
		activePrefix: "/internal/fees",
		superAdminOnly: false,
	},
	{
		label: "Audit log",
		href: "/internal/audit-log",
		icon: ClipboardTextIcon,
		activePrefix: "/internal/audit-log",
		superAdminOnly: false,
	},
] as const;

export function InternalSidebar({
	internalAdminSession,
}: {
	internalAdminSession: InternalAdminSessionDto;
}) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const visibleNavItems = navItems.filter(
		(item) =>
			!item.superAdminOnly || internalAdminSession.role === "super_admin",
	);
	// Longest-prefix match — "/internal" would otherwise also match
	// "/internal/merchants" and highlight both nav items at once.
	const activeItem = visibleNavItems
		.filter(
			(item) =>
				pathname === item.href || pathname.startsWith(`${item.activePrefix}/`),
		)
		.reduce<(typeof visibleNavItems)[number] | null>(
			(best, item) =>
				!best || item.activePrefix.length > best.activePrefix.length
					? item
					: best,
			null,
		);

	const { isMobile, setOpenMobile } = useSidebar();

	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is a deliberate re-trigger signal, not read in the effect body.
	useEffect(() => {
		if (isMobile) {
			setOpenMobile(false);
		}
	}, [pathname, isMobile, setOpenMobile]);

	return (
		<Sidebar collapsible="icon" className="border-destructive/20">
			<SidebarHeader className="border-b border-(--line)">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild tooltip="SubPilot Internal">
							<Link to="/internal">
								<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
									<span className="size-2.5 rounded-full bg-destructive" />
								</span>
								<span className="flex flex-col leading-none">
									<span className="text-sm font-semibold tracking-tight">
										SubPilot
									</span>
									<span className="mt-0.5 font-heading text-[0.60rem] text-sidebar-foreground/50">
										Internal — staff only
									</span>
								</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{visibleNavItems.map((item) => {
								const isActive = activeItem?.label === item.label;
								return (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton
											asChild
											isActive={isActive}
											tooltip={item.label}
										>
											<Link to={item.href}>
												<item.icon />
												<span>{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarRail />
		</Sidebar>
	);
}
