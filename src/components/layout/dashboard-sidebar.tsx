import {
	ArrowsClockwiseIcon,
	BankIcon,
	ChartBarIcon,
	ChartLineUpIcon,
	ClipboardTextIcon,
	ClockClockwiseIcon,
	GearIcon,
	ReceiptIcon,
	ShareNetworkIcon,
	SquaresFourIcon,
	UsersIcon,
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

const navItems = [
	{
		label: "Overview",
		href: "/overview",
		icon: SquaresFourIcon,
		activePrefix: "/overview",
	},
	{
		label: "Analytics",
		href: "/analytics",
		icon: ChartBarIcon,
		activePrefix: "/analytics",
	},
	{
		label: "Plans",
		href: "/plans",
		icon: ClipboardTextIcon,
		activePrefix: "/plans",
	},
	{
		label: "Subscriptions",
		href: "/subscriptions",
		icon: ArrowsClockwiseIcon,
		activePrefix: "/subscriptions",
	},
	{
		label: "Invoices",
		href: "/invoices",
		icon: ReceiptIcon,
		activePrefix: "/invoices",
	},
	{
		label: "Customers",
		href: "/customers",
		icon: UsersIcon,
		activePrefix: "/customers",
	},
	{
		label: "Revenue",
		href: "/revenue",
		icon: ChartLineUpIcon,
		activePrefix: "/revenue",
	},
	{
		label: "Payouts",
		href: "/payouts",
		icon: BankIcon,
		activePrefix: "/payouts",
	},
	{
		label: "Webhooks",
		href: "/webhooks",
		icon: ShareNetworkIcon,
		activePrefix: "/webhooks",
	},
	{
		label: "Events",
		href: "/events",
		icon: ClockClockwiseIcon,
		activePrefix: "/events",
	},
	{
		label: "Settings",
		href: "/settings/account",
		icon: GearIcon,
		activePrefix: "/settings",
	},
] as const;

export function DashboardSidebar() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { isMobile, setOpenMobile } = useSidebar();

	// The mobile sidebar renders as an overlay Sheet — without this, it stays
	// open on top of the newly-navigated-to page until the user manually
	// dismisses it, instead of closing the way a mobile nav drawer should the
	// moment a destination is picked.
	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is a deliberate re-trigger signal, not read in the effect body — the point is to re-run this on every navigation.
	useEffect(() => {
		if (isMobile) {
			setOpenMobile(false);
		}
	}, [pathname, isMobile, setOpenMobile]);

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className="border-b border-(--line)">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild tooltip="SubPilot">
							<Link to="/overview">
								<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-(--brand)/25 bg-(--brand)/10">
									<span className="size-2.5 rounded-full bg-(--brand)" />
								</span>
								<span className="flex flex-col leading-none">
									<span className="text-sm font-semibold tracking-tight">
										SubPilot
									</span>
									<span className="mt-0.5 font-heading text-[0.60rem] text-sidebar-foreground/50">
										Recurring billing
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
							{navItems.map((item) => {
								const isActive =
									pathname === item.href ||
									pathname.startsWith(`${item.activePrefix}/`);
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
