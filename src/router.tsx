import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { RootErrorFallback } from "./components/layout/root-error-fallback.tsx";
import { PageSkeleton } from "./components/ui/page-skeleton.tsx";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const context = getContext();

	const router = createTanStackRouter({
		routeTree,
		context,
		scrollRestoration: true,
		defaultPreload: "intent",
		// Matches the QueryClient's default staleTime (see root-provider.tsx).
		// At 0, a hover-triggered preload was considered stale again by the
		// time the user actually clicked, so the intent-preload was mostly
		// wasted — the route re-fetched on entry anyway.
		defaultPreloadStaleTime: 30_000,
		defaultErrorComponent: RootErrorFallback,
		defaultPendingComponent: PageSkeleton,
		defaultPendingMs: 300,
		defaultPendingMinMs: 300,
	});

	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
