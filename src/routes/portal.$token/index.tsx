import { WarningCircleIcon } from "@phosphor-icons/react";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent } from "#/components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { portalSubscriptionQueryOptions } from "#/data/portal.ts";
import { formatRelativeBillingDate } from "#/data/subscriptions.ts";
import { CATEGORY_COPY, classifyError } from "#/lib/api/classify-error.ts";
import {
	cancelPortalSubscription,
	updatePortalCard,
} from "#/lib/api/portal.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatDateLong as formatDate } from "#/lib/date.ts";
import type { PortalSubscriptionViewDto } from "#/types/api.ts";

export const Route = createFileRoute("/portal/$token/")({
	component: PortalOverviewPage,
	head: () => ({ meta: [{ title: "Your subscription | SubPilot" }] }),
});

type PortalUiState =
	| "active"
	| "past_due"
	| "scheduled_cancel"
	| "cancelled_ended"
	| "paused"
	| "expired";

function resolveUiState(sub: PortalSubscriptionViewDto): PortalUiState {
	if (sub.status === "expired") return "expired";
	if (sub.status === "cancelled") return "cancelled_ended";
	if (sub.status === "paused") return "paused";
	if (sub.status === "past_due") return "past_due";
	if (sub.cancelAtPeriodEnd) return "scheduled_cancel";
	return "active";
}

const statusLabel: Record<PortalUiState, string> = {
	active: "Active",
	past_due: "Payment retrying",
	scheduled_cancel: "Ending soon",
	cancelled_ended: "Ended",
	paused: "Paused",
	expired: "Expired",
};

const statusTone: Record<PortalUiState, "success" | "warning" | "neutral"> = {
	active: "success",
	past_due: "warning",
	scheduled_cancel: "warning",
	cancelled_ended: "neutral",
	paused: "neutral",
	expired: "neutral",
};

function PortalOverviewPage() {
	const { token } = Route.useParams();
	const queryClient = useQueryClient();
	const { data: subscription } = useSuspenseQuery(
		portalSubscriptionQueryOptions(token),
	);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [cancelReason, setCancelReason] = useState("");

	const uiState = resolveUiState(subscription);

	const cancelMutation = useMutation({
		mutationFn: (reason: string) =>
			cancelPortalSubscription({
				data: { token, reason: reason || undefined },
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: portalSubscriptionQueryOptions(token).queryKey,
			});
			setCancelDialogOpen(false);
			setCancelReason("");
			toast.success("Cancellation scheduled");
		},
		onError: (error) => {
			const message = error instanceof Error ? error.message : String(error);
			toast.error(CATEGORY_COPY[classifyError(message)]);
		},
	});

	const updateCardMutation = useMutation({
		mutationFn: () => updatePortalCard({ data: { token } }),
		onSuccess: (result) => {
			window.location.assign(result.checkoutUrl);
		},
		onError: (error) => {
			const message = error instanceof Error ? error.message : String(error);
			toast.error(CATEGORY_COPY[classifyError(message)]);
		},
	});

	return (
		<div className="flex flex-col gap-5">
			<Card className="border border-(--line) bg-(--surface-1) shadow-none">
				<CardContent className="flex flex-col gap-4 pt-6">
					<div className="flex items-center justify-between gap-3">
						<h1 className="text-xl font-semibold tracking-tight text-(--ink)">
							{subscription.planName}
						</h1>
						<StatusBadge tone={statusTone[uiState]}>
							{statusLabel[uiState]}
						</StatusBadge>
					</div>

					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p className="m-0 text-(--ink-3)">Next billing</p>
							<p className="m-0 mt-0.5 font-medium text-(--ink)">
								{uiState === "cancelled_ended" || uiState === "expired"
									? "—"
									: formatRelativeBillingDate(subscription.nextBillingDate)}
							</p>
						</div>
						<div>
							<p className="m-0 text-(--ink-3)">Amount</p>
							<p className="m-0 mt-0.5 font-medium text-(--ink)">
								{formatNGN(subscription.planAmount)} /{" "}
								{subscription.billingInterval}
							</p>
						</div>
						{(subscription.cardBrand || subscription.cardLast4) && (
							<div className="col-span-2">
								<p className="m-0 text-(--ink-3)">Card on file</p>
								<p className="m-0 mt-0.5 font-medium text-(--ink)">
									{subscription.cardBrand ?? "Card"} ••••{" "}
									{subscription.cardLast4 ?? "----"}
								</p>
							</div>
						)}
					</div>

					{uiState === "past_due" && (
						<Alert className="border-amber-500/20 bg-amber-500/5">
							<WarningCircleIcon className="text-(--warning)" />
							<AlertTitle className="text-(--ink)">Payment retrying</AlertTitle>
							<AlertDescription className="text-(--ink-3)">
								Your payment is being retried. We'll notify you.
							</AlertDescription>
						</Alert>
					)}

					{uiState === "scheduled_cancel" && (
						<p className="m-0 text-sm text-(--ink-2)">
							Your subscription will end on{" "}
							<span className="font-medium text-(--ink)">
								{formatDate(subscription.currentPeriodEnd)}
							</span>
							. You'll keep access until then.
						</p>
					)}

					{uiState === "paused" && (
						<p className="m-0 text-sm text-(--ink-2)">
							Billing is paused. Contact the business to resume.
						</p>
					)}

					{uiState === "cancelled_ended" && (
						<p className="m-0 text-sm text-(--ink-2)">
							Your subscription has ended.
						</p>
					)}

					{uiState === "expired" && (
						<p className="m-0 text-sm text-(--ink-2)">
							Your subscription expired on{" "}
							{formatDate(subscription.currentPeriodEnd)}.
						</p>
					)}
				</CardContent>
			</Card>

			{(uiState === "active" ||
				uiState === "past_due" ||
				uiState === "scheduled_cancel" ||
				uiState === "paused") && (
				<div className="flex flex-col gap-3">
					<div>
						<Button
							onClick={() => updateCardMutation.mutate()}
							disabled={updateCardMutation.isPending}
							className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							{updateCardMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Redirecting…
								</>
							) : (
								"Update card"
							)}
						</Button>
						<p className="mt-1 text-xs text-(--ink-3)">
							You'll be redirected to a secure Nomba flow.
						</p>
					</div>
					{uiState !== "paused" && (
						<div>
							<Button
								asChild
								variant="outline"
								className="w-full border-(--line)"
							>
								<Link to="/portal/$token/plans" params={{ token }}>
									Change plan
								</Link>
							</Button>
							<p className="mt-1 text-xs text-(--ink-3)">
								We'll show any credit or additional charge before you confirm.
							</p>
						</div>
					)}
					{uiState !== "scheduled_cancel" && (
						<div>
							<Button
								variant="outline"
								onClick={() => setCancelDialogOpen(true)}
								className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
							>
								Cancel subscription
							</Button>
							<p className="mt-1 text-xs text-(--ink-3)">
								Your access continues until the end of the current billing
								period.
							</p>
						</div>
					)}
				</div>
			)}

			{uiState !== "expired" && (
				<div className="text-center">
					<Link
						to="/portal/$token/invoices"
						params={{ token }}
						className="text-sm font-medium text-(--brand) hover:underline"
					>
						View invoices
					</Link>
				</div>
			)}

			<Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel subscription?</DialogTitle>
						<DialogDescription>
							Cancels at the end of the current period.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-1.5">
						<p className="text-sm font-medium text-(--ink-2)">
							Reason{" "}
							<span className="font-normal text-(--ink-3)">(optional)</span>
						</p>
						<Textarea
							placeholder="Let us know why you're leaving…"
							value={cancelReason}
							onChange={(e) => setCancelReason(e.target.value)}
							rows={3}
							className="rounded-md border-(--line) bg-(--surface) px-3 py-2"
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCancelDialogOpen(false)}
							className="border-(--line)"
						>
							Keep subscription
						</Button>
						<Button
							variant="destructive"
							onClick={() => cancelMutation.mutate(cancelReason)}
							disabled={cancelMutation.isPending}
						>
							{cancelMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Cancelling…
								</>
							) : (
								"Cancel subscription"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
