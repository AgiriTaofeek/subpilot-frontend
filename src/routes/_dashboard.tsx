import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { DashboardHeader } from "#/components/layout/dashboard-header.tsx";
import { DashboardSidebar } from "#/components/layout/dashboard-sidebar.tsx";
import {
	RouteErrorFallback,
	SessionExpiredFallback,
} from "#/components/layout/route-error-fallback.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	SIDEBAR_COOKIE_NAME,
	SidebarInset,
	SidebarProvider,
} from "#/components/ui/sidebar.tsx";
import { merchantSessionQueryOptions } from "#/data/auth.ts";
import { isSessionError } from "#/lib/api/is-session-error.ts";

// Reads the cookie SidebarProvider's own toggle handler already writes
// (components/ui/sidebar.tsx) so the server-rendered HTML reflects the
// user's last choice from the first byte. Isomorphic (not a server function)
// because the cookie isn't httpOnly: on the client we read it straight from
// document.cookie, avoiding an RPC round-trip on every client-side
// navigation; on the server (initial SSR) we still need getCookie() since
// there's no document there.
const getSidebarOpen = createIsomorphicFn()
	.server(() => getCookie(SIDEBAR_COOKIE_NAME) !== "false")
	.client(() => {
		const match = document.cookie.match(
			new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=([^;]*)`),
		);
		return match?.[1] !== "false";
	});

export const Route = createFileRoute("/_dashboard")({
	beforeLoad: async ({ context }) => {
		try {
			const [merchantSession, sidebarOpen] = await Promise.all([
				context.queryClient.ensureQueryData(merchantSessionQueryOptions()),
				getSidebarOpen(),
			]);
			return { merchantSession, sidebarOpen };
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
		return <SessionExpiredFallback />;
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
	const { merchantSession, sidebarOpen } = Route.useRouteContext();

	return (
		<SidebarProvider defaultOpen={sidebarOpen}>
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
