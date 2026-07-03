import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";

import { DashboardHeader } from "#/components/layout/dashboard-header.tsx";
import { DashboardSidebar } from "#/components/layout/dashboard-sidebar.tsx";
import { RouteErrorFallback } from "#/components/layout/route-error-fallback.tsx";
import { Button } from "#/components/ui/button.tsx";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar.tsx";
import { merchantSessionQueryOptions } from "#/data/auth.ts";
import { isSessionError } from "#/lib/api/is-session-error.ts";

export const Route = createFileRoute("/_dashboard")({
	beforeLoad: async ({ context }) => {
		try {
			const merchantSession = await context.queryClient.ensureQueryData(
				merchantSessionQueryOptions(),
			);
			return { merchantSession };
		} catch (error) {
			// isUnauthenticatedBackendError (BackendApiError.status) only
			// works when this beforeLoad runs server-side during SSR — the
			// error stays in-process, so its class survives. On a
			// client-side navigation (e.g. right after signup/login),
			// getMerchantSession() is called over the createServerFn RPC
			// bridge, which strips BackendApiError down to a plain Error
			// with only .message intact. Classifying on the message
			// (isSessionError, same helper RootErrorFallback and
			// useHandleMutationError already use) works in both cases.
			const message = error instanceof Error ? error.message : String(error);
			if (isSessionError(message)) {
				// A different merchant could log into this same browser tab
				// after this one's session expires. Without clearing here,
				// every cached business-data query (customers, invoices,
				// revenue, ...) would still be sitting in the QueryClient
				// under static, account-unscoped keys for them to see.
				context.queryClient.clear();
				throw redirect({ to: "/auth/login" });
			}

			throw error;
		}
	},
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
	const { merchantSession } = Route.useRouteContext();

	return (
		<SidebarProvider>
			<DashboardSidebar merchantSession={merchantSession} />
			<SidebarInset>
				<DashboardHeader />
				<div className="flex flex-1 flex-col">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
