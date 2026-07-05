import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";

import { Card, CardContent } from "#/components/ui/card.tsx";
import { internalDashboardSummaryQueryOptions } from "#/data/internal-dashboard.ts";

const internalGateRouteApi = getRouteApi("/_internalGate");

export const Route = createFileRoute("/_internalGate/internal/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			internalDashboardSummaryQueryOptions(),
		);
	},
	component: InternalDashboardPage,
	head: () => ({ meta: [{ title: "Internal dashboard | SubPilot" }] }),
});

function InternalDashboardPage() {
	const { internalAdminSession } = internalGateRouteApi.useRouteContext();
	const { data: summary } = useSuspenseQuery(
		internalDashboardSummaryQueryOptions(),
	);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
					Dashboard
				</h1>
				<p className="mt-1 text-(--ink-3)">
					Signed in as {internalAdminSession.displayName} (
					{internalAdminSession.role}).
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<Link
					to="/internal/merchants"
					search={{ status: "under_review", q: "" }}
					className="no-underline"
				>
					<Card className="border border-(--line) bg-(--surface-1) shadow-none transition-colors hover:bg-(--surface-2)">
						<CardContent className="py-5">
							<p className="island-kicker m-0">Pending merchant activations</p>
							<p className="mt-1 text-3xl font-semibold text-(--ink)">
								{summary.pendingMerchantActivations}
							</p>
							<p className="mt-1 text-xs text-(--ink-3)">
								Merchants awaiting review before going active
							</p>
						</CardContent>
					</Card>
				</Link>

				{internalAdminSession.role === "super_admin" && (
					<Link to="/internal/refunds" className="no-underline">
						<Card className="border border-(--line) bg-(--surface-1) shadow-none transition-colors hover:bg-(--surface-2)">
							<CardContent className="py-5">
								<p className="island-kicker m-0">Pending refund approvals</p>
								<p className="mt-1 text-3xl font-semibold text-(--ink)">
									{summary.pendingRefundApprovals}
								</p>
								<p className="mt-1 text-xs text-(--ink-3)">
									Refunds waiting on a super admin decision
								</p>
							</CardContent>
						</Card>
					</Link>
				)}
			</div>
		</div>
	);
}
