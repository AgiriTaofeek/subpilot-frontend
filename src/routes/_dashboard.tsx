import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { DashboardHeader } from "#/components/layout/dashboard-header.tsx";
import { DashboardSidebar } from "#/components/layout/dashboard-sidebar.tsx";
import { RouteErrorFallback } from "#/components/layout/route-error-fallback.tsx";
import { Button } from "#/components/ui/button.tsx";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar.tsx";
import { isSessionError } from "#/lib/api/is-session-error.ts";

export const Route = createFileRoute("/_dashboard")({
	// TODO(blocked): Add the real beforeLoad merchant session bootstrap and redirect once
	// the backend ships GET /v1/auth/me and a usable refresh contract. See docs/BACKEND-GAPS.md Gap 1.
	component: DashboardLayout,
	errorComponent: DashboardErrorFallback,
});

function DashboardErrorFallback({
	error,
	reset,
}: {
	error: Error;
	reset: () => void;
}) {
	if (isSessionError(error.message)) {
		return (
			<RouteErrorFallback
				title="Your session has expired"
				description="Please log in again to continue."
				action={
					<Button
						asChild
						className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
					>
						<Link to="/auth/login">Log in</Link>
					</Button>
				}
			/>
		);
	}

	return (
		<RouteErrorFallback
			title="Something went wrong"
			description="We couldn't load this page. Try again in a moment."
			action={
				<Button variant="outline" onClick={reset} className="border-(--line)">
					Try again
				</Button>
			}
		/>
	);
}

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
