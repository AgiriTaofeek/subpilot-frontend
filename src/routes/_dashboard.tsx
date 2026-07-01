import { createFileRoute, Outlet } from "@tanstack/react-router";

import { DashboardHeader } from "#/components/layout/dashboard-header.tsx";
import { DashboardSidebar } from "#/components/layout/dashboard-sidebar.tsx";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar.tsx";

export const Route = createFileRoute("/_dashboard")({
	component: DashboardLayout,
});

function DashboardLayout() {
	return (
		<SidebarProvider>
			<DashboardSidebar />
			<SidebarInset>
				<DashboardHeader />
				<div className="flex flex-1 flex-col">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
