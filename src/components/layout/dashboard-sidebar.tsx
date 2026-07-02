import {
	ArrowsClockwiseIcon,
	ChartBarIcon,
	ChartLineUpIcon,
	ClipboardTextIcon,
	ClockClockwiseIcon,
	GearIcon,
	ReceiptIcon,
	ShareNetworkIcon,
	SignOutIcon,
	SquaresFourIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "#/components/ui/sidebar.tsx";
import { logoutMerchant } from "#/lib/api/auth.ts";
import type { AuthSessionDto } from "#/types/api.ts";

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

export function DashboardSidebar({
	merchantSession,
}: {
	merchantSession: AuthSessionDto;
}) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const navigate = useNavigate();

	async function handleLogout() {
		try {
			await logoutMerchant();
			toast.success("Logged out");
			await navigate({ to: "/auth/login" });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Couldn't log you out.",
			);
		}
	}

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

			<SidebarFooter className="border-t border-(--line)">
				<SidebarMenu>
					<SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
						<div className="flex items-center gap-2 px-2 py-1.5">
							<span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-(--brand)/15 text-[0.6rem] font-semibold text-(--brand)">
								{merchantSession.businessName.charAt(0)}
							</span>
							<div className="min-w-0">
								<p className="truncate text-xs font-medium text-sidebar-foreground">
									{merchantSession.businessName}
								</p>
								<p className="truncate text-[0.7rem] text-sidebar-foreground/70">
									{merchantSession.email}
								</p>
							</div>
						</div>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton
							onClick={handleLogout}
							tooltip="Log out"
							className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
						>
							<SignOutIcon />
							<span>Log out</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
