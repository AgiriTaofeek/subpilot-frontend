import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { InternalHeader } from "#/components/layout/internal-header.tsx";
import { InternalSidebar } from "#/components/layout/internal-sidebar.tsx";
import {
	RouteErrorFallback,
	SessionExpiredFallback,
} from "#/components/layout/route-error-fallback.tsx";
import { SkipToContentLink } from "#/components/layout/skip-to-content-link.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	SIDEBAR_COOKIE_NAME,
	SidebarInset,
	SidebarProvider,
} from "#/components/ui/sidebar.tsx";
import { internalAdminSessionQueryOptions } from "#/data/internal-auth.ts";
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

export const Route = createFileRoute("/_internalGate")({
	beforeLoad: async ({ context }) => {
		try {
			const [internalAdminSession, sidebarOpen] = await Promise.all([
				context.queryClient.ensureQueryData(internalAdminSessionQueryOptions()),
				getSidebarOpen(),
			]);

			return { internalAdminSession, sidebarOpen };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (isSessionError(message)) {
				context.queryClient.clear();
				throw redirect({ to: "/internal/login" });
			}
			throw error;
		}
	},
	component: InternalLayout,
	errorComponent: InternalErrorFallback,
});

function InternalErrorFallback({
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

function InternalLayout() {
	const { internalAdminSession, sidebarOpen } = Route.useRouteContext();

	return (
		<SidebarProvider defaultOpen={sidebarOpen}>
			<SkipToContentLink />
			<InternalSidebar internalAdminSession={internalAdminSession} />
			<SidebarInset>
				<InternalHeader internalAdminSession={internalAdminSession} />
				<div id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
