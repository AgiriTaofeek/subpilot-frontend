import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent } from "#/components/ui/card.tsx";
import { Empty, EmptyHeader, EmptyTitle } from "#/components/ui/empty.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import {
	portalAvailablePlansQueryOptions,
	portalSubscriptionQueryOptions,
} from "#/data/portal.ts";
import { CATEGORY_COPY, classifyError } from "#/lib/api/classify-error.ts";
import { changePortalPlan } from "#/lib/api/portal.ts";
import { formatNGN } from "#/lib/currency.ts";

export const Route = createFileRoute("/portal/$token/plans")({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			portalAvailablePlansQueryOptions(params.token),
		);
	},
	component: PortalPlansPage,
	head: () => ({ meta: [{ title: "Change plan | SubPilot" }] }),
});

function PortalPlansPage() {
	const { token } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: subscription } = useSuspenseQuery(
		portalSubscriptionQueryOptions(token),
	);
	const { data: availablePlans } = useSuspenseQuery(
		portalAvailablePlansQueryOptions(token),
	);
	const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

	const selectedPlan =
		availablePlans.find((p) => p.planId === selectedPlanId) ?? null;

	const changePlanMutation = useMutation({
		mutationFn: (newPlanId: string) =>
			changePortalPlan({ data: { token, newPlanId } }),
		onSuccess: async (result) => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: portalSubscriptionQueryOptions(token).queryKey,
				}),
				queryClient.invalidateQueries({
					queryKey: portalAvailablePlansQueryOptions(token).queryKey,
				}),
			]);
			if (result.chargedImmediately && result.netChargeToday > 0) {
				toast.success(
					`Plan changed. ${formatNGN(result.netChargeToday)} charged today.`,
				);
			} else if (result.netCreditForward > 0) {
				toast.success(
					`Plan changed. ${formatNGN(result.netCreditForward)} credited to your next invoice.`,
				);
			} else {
				toast.success("Plan changed.");
			}
			navigate({ to: "/portal/$token", params: { token } });
		},
		onError: (error) => {
			const message = error instanceof Error ? error.message : String(error);
			toast.error(CATEGORY_COPY[classifyError(message)]);
		},
	});

	return (
		<div className="flex flex-col gap-5">
			<h1 className="text-xl font-semibold tracking-tight text-(--ink)">
				Change plan
			</h1>

			{!selectedPlan ? (
				availablePlans.length === 0 ? (
					<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
						<EmptyHeader>
							<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
								No alternative plans are available at this time.
							</EmptyTitle>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="flex flex-col gap-3">
						<Card className="border border-(--line) bg-(--surface-1) shadow-none">
							<CardContent className="flex items-center justify-between gap-3 py-4">
								<div>
									<span className="font-medium text-(--ink)">
										{subscription.planName}
									</span>
									<p className="mt-1 text-sm text-(--ink-2)">
										{formatNGN(subscription.planAmount)} /{" "}
										{subscription.billingInterval}
									</p>
								</div>
								<Button
									variant="outline"
									disabled
									className="border-(--line) text-(--ink-3)"
								>
									Current
								</Button>
							</CardContent>
						</Card>
						{availablePlans.map((plan) => (
							<Card
								key={plan.planId}
								className="border border-(--line) bg-(--surface-1) shadow-none"
							>
								<CardContent className="flex items-center justify-between gap-3 py-4">
									<div>
										<span className="font-medium text-(--ink)">
											{plan.name}
										</span>
										<p className="mt-1 text-sm text-(--ink-2)">
											{formatNGN(plan.amount)} / {plan.billingInterval}
										</p>
									</div>
									<Button
										variant="outline"
										onClick={() => setSelectedPlanId(plan.planId)}
										className="border-(--line)"
									>
										Select
									</Button>
								</CardContent>
							</Card>
						))}
					</div>
				)
			) : (
				<>
					<Card className="border border-(--line) bg-(--surface-1) shadow-none">
						<CardContent className="flex flex-col gap-1 py-4">
							<p className="island-kicker m-0">Switching to</p>
							<p className="text-lg font-semibold text-(--ink)">
								{selectedPlan.name}
							</p>
							<p className="m-0 text-sm text-(--ink-2)">
								{formatNGN(selectedPlan.amount)} /{" "}
								{selectedPlan.billingInterval}
							</p>
						</CardContent>
					</Card>

					<p className="m-0 text-sm text-(--ink-2)">
						Any credit or additional charge for the switch will be calculated
						when you confirm.
					</p>

					<div className="flex flex-col gap-3">
						<Button
							onClick={() => changePlanMutation.mutate(selectedPlan.planId)}
							disabled={changePlanMutation.isPending}
							className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							{changePlanMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Confirming…
								</>
							) : (
								"Confirm change"
							)}
						</Button>
						<div className="flex items-center justify-center gap-4 text-sm">
							<button
								type="button"
								onClick={() => setSelectedPlanId(null)}
								className="font-medium text-(--brand) hover:underline"
							>
								Change selection
							</button>
							<Link
								to="/portal/$token"
								params={{ token }}
								className="font-medium text-(--ink-3) hover:text-(--ink-2)"
							>
								Cancel
							</Link>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
