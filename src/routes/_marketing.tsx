import { createFileRoute, Outlet } from "@tanstack/react-router";

import MarketingFooter from "#/components/layout/marketing-footer.tsx";
import MarketingHeader from "#/components/layout/marketing-header.tsx";

export const Route = createFileRoute("/_marketing")({
	component: MarketingLayout,
});

function MarketingLayout() {
	return (
		<>
			<MarketingHeader />
			<Outlet />
			<MarketingFooter />
		</>
	);
}
