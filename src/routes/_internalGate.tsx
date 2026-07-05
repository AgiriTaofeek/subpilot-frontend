import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { InternalHeader } from "#/components/layout/internal-header.tsx";
import { InternalSidebar } from "#/components/layout/internal-sidebar.tsx";
import {
	RouteErrorFallback,
	SessionExpiredFallback,
} from "#/components/layout/route-error-fallback.tsx";
import { Button } from "#/components/ui/button.tsx";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar.tsx";
import { internalAdminSessionQueryOptions } from "#/data/internal-auth.ts";
import { isSessionError } from "#/lib/api/is-session-error.ts";

export const Route = createFileRoute("/_internalGate")({
	beforeLoad: async ({ context }) => {
		try {
			const internalAdminSession = await context.queryClient.ensureQueryData(
				internalAdminSessionQueryOptions(),
			);
			return { internalAdminSession };
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
	const { internalAdminSession } = Route.useRouteContext();

	return (
		<SidebarProvider defaultOpen>
			<InternalSidebar internalAdminSession={internalAdminSession} />
			<SidebarInset>
				<InternalHeader />
				<div className="flex flex-1 flex-col">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
