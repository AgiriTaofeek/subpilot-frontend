import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
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
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
import { Field, FieldLabel } from "#/components/ui/field.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { internalRefundsListQueryOptions } from "#/data/internal-refunds.ts";
import { refundStatusLabel, refundStatusTone } from "#/data/invoices.ts";
import { useHandleMutationError } from "#/hooks/use-handle-mutation-error.ts";
import {
	approveInternalRefund,
	rejectInternalRefund,
} from "#/lib/api/internal-refunds.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatDate } from "#/lib/date.ts";

const internalGateRouteApi = getRouteApi("/_internalGate");

export const Route = createFileRoute("/_internalGate/internal/refunds/")({
	loader: async ({ context }) => {
		if (context.internalAdminSession.role === "super_admin") {
			await context.queryClient.ensureQueryData(
				internalRefundsListQueryOptions(),
			);
		}
	},
	component: InternalRefundsPage,
	head: () => ({ meta: [{ title: "Refunds | SubPilot Internal" }] }),
});

function InternalRefundsPage() {
	const { internalAdminSession } = internalGateRouteApi.useRouteContext();

	if (internalAdminSession.role !== "super_admin") {
		return (
			<div className="p-6">
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							Restricted to super admins
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Refund approval is limited to the super admin role.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</div>
		);
	}

	return <RefundsQueue />;
}

function RefundsQueue() {
	const queryClient = useQueryClient();
	const handleMutationError = useHandleMutationError();
	const { data: refunds } = useSuspenseQuery(internalRefundsListQueryOptions());
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [rejectReason, setRejectReason] = useState("");

	function invalidateRefunds() {
		return Promise.all([
			queryClient.invalidateQueries({
				queryKey: internalRefundsListQueryOptions().queryKey,
			}),
			queryClient.invalidateQueries({
				queryKey: ["internal-dashboard-summary"],
			}),
		]);
	}

	const approveMutation = useMutation({
		mutationFn: (refundId: string) =>
			approveInternalRefund({ data: { refundId } }),
		onSuccess: async () => {
			await invalidateRefunds();
			toast.success("Refund approved");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't approve this refund.",
			}),
	});

	const rejectMutation = useMutation({
		mutationFn: () =>
			rejectInternalRefund({
				data: {
					refundId: rejectingId as string,
					reason: rejectReason.trim() || undefined,
				},
			}),
		onSuccess: async () => {
			await invalidateRefunds();
			setRejectingId(null);
			setRejectReason("");
			toast.success("Refund rejected");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't reject this refund.",
			}),
	});

	const pending = refunds.filter(
		(refund) =>
			refund.status === "pending_approval" || refund.status === "pending",
	);
	const resolved = refunds.filter(
		(refund) =>
			refund.status !== "pending_approval" && refund.status !== "pending",
	);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Refunds
			</h1>

			{pending.length === 0 ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No refunds waiting on approval
						</EmptyTitle>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="flex flex-col gap-3">
					{pending.map((refund) => (
						<Card
							key={refund.id}
							className="border border-(--line) bg-(--surface-1) shadow-none"
						>
							<CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<div className="flex items-center gap-2">
										<p className="m-0 font-medium text-(--ink)">
											{formatNGN(refund.amount)}
										</p>
										<StatusBadge tone={refundStatusTone[refund.status]}>
											{refundStatusLabel[refund.status]}
										</StatusBadge>
									</div>
									{refund.reason && (
										<p className="m-0 mt-0.5 text-xs text-(--ink-3)">
											{refund.reason}
										</p>
									)}
									<p className="m-0 mt-0.5 text-xs text-(--ink-3)">
										Invoice {refund.invoiceId} · {formatDate(refund.createdAt)}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setRejectingId(refund.id)}
										className="border-(--line)"
									>
										Reject
									</Button>
									<Button
										size="sm"
										onClick={() => approveMutation.mutate(refund.id)}
										disabled={approveMutation.isPending}
									>
										{approveMutation.isPending ? (
											<Spinner data-icon="inline-start" />
										) : (
											"Approve"
										)}
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{resolved.length > 0 && (
				<div>
					<p className="island-kicker m-0 mb-2">Resolved</p>
					<Card className="border border-(--line) bg-(--surface-1) shadow-none">
						<CardContent className="flex flex-col divide-y divide-(--line) py-0">
							{resolved.map((refund) => (
								<div
									key={refund.id}
									className="flex items-center justify-between gap-3 py-3 first:pt-4 last:pb-4"
								>
									<div className="flex items-center gap-2">
										<p className="m-0 font-medium text-(--ink)">
											{formatNGN(refund.amount)}
										</p>
										<StatusBadge tone={refundStatusTone[refund.status]}>
											{refundStatusLabel[refund.status]}
										</StatusBadge>
									</div>
									<p className="m-0 text-xs text-(--ink-3)">
										{formatDate(refund.createdAt)}
									</p>
								</div>
							))}
						</CardContent>
					</Card>
				</div>
			)}

			<Dialog
				open={rejectingId !== null}
				onOpenChange={(open) => !open && setRejectingId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject this refund?</DialogTitle>
						<DialogDescription>
							The merchant's refund request will not be processed.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel htmlFor="reject-reason">Reason (optional)</FieldLabel>
						<Textarea
							id="reject-reason"
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							placeholder="Why is this being rejected?"
							className="border-(--line) bg-(--surface)"
						/>
					</Field>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRejectingId(null)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => rejectMutation.mutate()}
							disabled={rejectMutation.isPending}
						>
							{rejectMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Rejecting…
								</>
							) : (
								"Reject refund"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
