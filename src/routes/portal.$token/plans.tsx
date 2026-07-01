import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent } from "#/components/ui/card.tsx";
import { Empty, EmptyHeader, EmptyTitle } from "#/components/ui/empty.tsx";
import { formatInterval, plans } from "#/data/plans.ts";
import { resolvePortalToken } from "#/data/portal.ts";
import { formatNGN } from "#/lib/currency.ts";
import { calculateProration } from "#/lib/proration.ts";

export const Route = createFileRoute("/portal/$token/plans")({
	component: PortalPlansPage,
	head: () => ({ meta: [{ title: "Change plan | SubPilot" }] }),
});

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

function PortalPlansPage() {
	const { token } = Route.useParams();
	const context = resolvePortalToken(token);
	const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);
	const [confirmed, setConfirmed] = useState(false);

	if (!context) return null;
	const { subscription } = context;

	const availablePlans = plans.filter((p) => p.status === "published");
	const currentPlan = plans.find((p) => p.id === subscription.planId);
	const alternatives = availablePlans.filter(
		(p) => p.id !== subscription.planId,
	);
	const selectedPlan =
		availablePlans.find((p) => p.id === selectedPlanId) ?? null;

	const proration =
		selectedPlan && currentPlan
			? calculateProration(
					currentPlan.amountKobo,
					selectedPlan.amountKobo,
					subscription.currentPeriodEnd,
				)
			: null;

	function handleConfirm() {
		if (confirming) return;
		setConfirming(true);
		setTimeout(() => {
			setConfirming(false);
			setConfirmed(true);
		}, 900);
	}

	if (confirmed) {
		return (
			<div className="flex flex-col items-center gap-3 py-10 text-center">
				<h1 className="text-lg font-semibold tracking-tight text-(--ink)">
					Plan changed
				</h1>
				<p className="max-w-xs text-sm text-(--ink-3)">
					You're now on the {selectedPlan?.name} plan.
				</p>
				<Button
					asChild
					className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
				>
					<Link to="/portal/$token" params={{ token }}>
						Back to overview
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			<h1 className="text-xl font-semibold tracking-tight text-(--ink)">
				Change plan
			</h1>

			{!selectedPlan ? (
				alternatives.length === 0 ? (
					<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
						<EmptyHeader>
							<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
								No alternative plans are available at this time.
							</EmptyTitle>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="flex flex-col gap-3">
						{currentPlan && (
							<Card className="border border-(--line) bg-(--surface-1) shadow-none">
								<CardContent className="flex items-center justify-between gap-3 py-4">
									<div>
										<div className="flex items-center gap-2">
											<span className="font-medium text-(--ink)">
												{currentPlan.name}
											</span>
											<Badge variant="secondary">Current plan</Badge>
										</div>
										<p className="mt-1 text-sm text-(--ink-2)">
											{formatNGN(currentPlan.amountKobo)} /{" "}
											{formatInterval(currentPlan.interval).toLowerCase()}
										</p>
										{currentPlan.description && (
											<p className="mt-1 text-xs text-(--ink-3)">
												{currentPlan.description}
											</p>
										)}
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
						)}
						{alternatives.map((plan) => (
							<Card
								key={plan.id}
								className="border border-(--line) bg-(--surface-1) shadow-none"
							>
								<CardContent className="flex items-center justify-between gap-3 py-4">
									<div>
										<span className="font-medium text-(--ink)">
											{plan.name}
										</span>
										<p className="mt-1 text-sm text-(--ink-2)">
											{formatNGN(plan.amountKobo)} /{" "}
											{formatInterval(plan.interval).toLowerCase()}
										</p>
										{plan.description && (
											<p className="mt-1 text-xs text-(--ink-3)">
												{plan.description}
											</p>
										)}
									</div>
									<Button
										variant="outline"
										onClick={() => setSelectedPlanId(plan.id)}
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
								{formatNGN(selectedPlan.amountKobo)} /{" "}
								{formatInterval(selectedPlan.interval).toLowerCase()}
							</p>
						</CardContent>
					</Card>

					<Card className="border border-(--line) bg-(--surface-1) shadow-none">
						<CardContent className="flex flex-col gap-3 py-4">
							<p className="island-kicker m-0">Proration preview</p>
							<div className="grid grid-cols-2 gap-3 text-sm">
								<div>
									<p className="m-0 text-(--ink-3)">Credit</p>
									<p className="m-0 mt-0.5 font-medium text-(--ink)">
										{proration && proration.creditKobo > 0
											? formatNGN(proration.creditKobo)
											: "—"}
									</p>
								</div>
								<div>
									<p className="m-0 text-(--ink-3)">Charge</p>
									<p className="m-0 mt-0.5 font-medium text-(--ink)">
										{proration && proration.chargeKobo > 0
											? formatNGN(proration.chargeKobo)
											: "—"}
									</p>
								</div>
								<div className="col-span-2">
									<p className="m-0 text-(--ink-3)">Effective date</p>
									<p className="m-0 mt-0.5 font-medium text-(--ink)">
										{formatDate(new Date().toISOString())}
									</p>
								</div>
							</div>
							<p className="m-0 text-sm text-(--ink-2)">
								{proration && proration.chargeKobo > 0
									? `You'll be charged ${formatNGN(proration.chargeKobo)} today, reflecting the remaining days on your current plan.`
									: proration && proration.creditKobo > 0
										? `A credit of ${formatNGN(proration.creditKobo)} will be applied to your next invoice.`
										: "No additional charge or credit for this change."}
							</p>
						</CardContent>
					</Card>

					<div className="flex flex-col gap-3">
						<Button
							onClick={handleConfirm}
							disabled={confirming}
							className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							{confirming ? "Confirming…" : "Confirm change"}
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
