import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
	RouteErrorFallback,
	SessionExpiredFallback,
} from "#/components/layout/route-error-fallback.tsx";
import { AmountInput } from "#/components/ui/amount-input.tsx";
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
import { Field, FieldLabel } from "#/components/ui/field.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip.tsx";
import {
	invoiceDetailQueryOptions,
	invoiceRefundsQueryOptions,
	invoiceStatusLabel,
	invoiceStatusTone,
	refundStatusLabel,
	refundStatusTone,
} from "#/data/invoices.ts";
import { useHandleMutationError } from "#/hooks/use-handle-mutation-error.ts";
import { classifyError } from "#/lib/api/classify-error.ts";
import { createInvoiceRefund, voidInvoice } from "#/lib/api/invoices.ts";
import { isSessionError } from "#/lib/api/is-session-error.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatDate } from "#/lib/date.ts";
import type { InvoiceStatusDto } from "#/types/api.ts";

export const Route = createFileRoute("/_dashboard/invoices/$invoiceId")({
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				invoiceDetailQueryOptions(params.invoiceId),
			),
			context.queryClient.ensureQueryData(
				invoiceRefundsQueryOptions(params.invoiceId),
			),
		]);
	},
	component: InvoiceDetailPage,
	errorComponent: InvoiceDetailErrorFallback,
	head: () => ({ meta: [{ title: "Invoice | SubPilot" }] }),
});

function InvoiceDetailErrorFallback({
	error,
	reset,
}: {
	error: Error;
	reset: () => void;
}) {
	if (isSessionError(error.message)) {
		return <SessionExpiredFallback />;
	}

	if (classifyError(error.message) === "not_found") {
		return (
			<RouteErrorFallback
				title="Invoice not found"
				description="This invoice may have been removed."
				action={
					<Button asChild variant="outline" className="border-(--line)">
						<Link to="/invoices">Back to invoices</Link>
					</Button>
				}
			/>
		);
	}

	return (
		<RouteErrorFallback
			title="Something went wrong"
			description="We couldn't load this invoice. Try again in a moment."
			action={
				<Button variant="outline" onClick={reset} className="border-(--line)">
					Try again
				</Button>
			}
		/>
	);
}

function formatPeriod(startIso: string, endIso: string): string {
	const start = new Date(startIso);
	const end = new Date(endIso);
	const opts: Intl.DateTimeFormatOptions = {
		month: "short",
		day: "numeric",
		year: "numeric",
	};
	return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function voidButtonState(
	status: InvoiceStatusDto,
): "enabled" | "disabled" | "hidden" {
	if (status === "pending") return "enabled";
	if (status === "paid") return "disabled";
	return "hidden";
}

function canRefund(status: InvoiceStatusDto): boolean {
	return status === "paid";
}

function InvoiceDetailPage() {
	const { invoiceId } = Route.useParams();
	const queryClient = useQueryClient();
	const { data: invoice } = useSuspenseQuery(
		invoiceDetailQueryOptions(invoiceId),
	);
	const { data: refunds } = useSuspenseQuery(
		invoiceRefundsQueryOptions(invoiceId),
	);
	const [voidOpen, setVoidOpen] = useState(false);
	const [refundOpen, setRefundOpen] = useState(false);
	const [refundAmountKobo, setRefundAmountKobo] = useState(0);
	const [refundReason, setRefundReason] = useState("");
	const handleMutationError = useHandleMutationError();

	const voidState = voidButtonState(invoice.status);

	const voidMutation = useMutation({
		mutationFn: () => voidInvoice({ data: { invoiceId } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: invoiceDetailQueryOptions(invoiceId).queryKey,
			});
			await queryClient.invalidateQueries({ queryKey: ["invoices"] });
			setVoidOpen(false);
			toast.success("Invoice voided");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't void the invoice.",
			}),
	});

	const refundMutation = useMutation({
		mutationFn: () =>
			createInvoiceRefund({
				data: {
					invoiceId,
					amount: refundAmountKobo > 0 ? refundAmountKobo : undefined,
					reason: refundReason.trim() || undefined,
				},
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: invoiceDetailQueryOptions(invoiceId).queryKey,
			});
			await queryClient.invalidateQueries({
				queryKey: invoiceRefundsQueryOptions(invoiceId).queryKey,
			});
			await queryClient.invalidateQueries({ queryKey: ["invoices"] });
			setRefundOpen(false);
			setRefundAmountKobo(0);
			setRefundReason("");
			toast.success("Refund initiated");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't refund this invoice.",
			}),
	});

	return (
		<div className="p-6">
			<div className="flex flex-col gap-4 border-b border-(--line) pb-6 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="font-heading text-xl text-(--ink)">
							{invoice.number}
						</h1>
						<StatusBadge tone={invoiceStatusTone[invoice.status]}>
							{invoiceStatusLabel[invoice.status]}
						</StatusBadge>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{canRefund(invoice.status) && (
						<Button
							variant="outline"
							onClick={() => setRefundOpen(true)}
							className="border-(--line)"
						>
							Refund
						</Button>
					)}

					{voidState !== "hidden" &&
						(voidState === "disabled" ? (
							<Tooltip>
								<TooltipTrigger asChild>
									<span>
										<Button
											variant="outline"
											disabled
											className="border-(--line) text-(--ink-3)"
										>
											Void
										</Button>
									</span>
								</TooltipTrigger>
								<TooltipContent>Cannot void a paid invoice</TooltipContent>
							</Tooltip>
						) : (
							<Button
								variant="outline"
								onClick={() => setVoidOpen(true)}
								className="border-destructive/30 text-destructive hover:bg-destructive/10"
							>
								Void
							</Button>
						))}
				</div>
			</div>

			<div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
				<div>
					<p className="m-0 text-(--ink-3)">Period</p>
					<p className="m-0 mt-0.5 font-medium text-(--ink)">
						{formatPeriod(invoice.periodStart, invoice.periodEnd)}
					</p>
				</div>
				<div>
					<p className="m-0 text-(--ink-3)">Customer</p>
					<p className="m-0 mt-0.5 font-medium text-(--ink)">
						<Link
							to="/customers/$customerId"
							params={{ customerId: invoice.customerId }}
							className="text-(--brand) hover:underline"
						>
							{invoice.customerName}
						</Link>
					</p>
				</div>
				<div>
					<p className="m-0 text-(--ink-3)">Subscription</p>
					<p className="m-0 mt-0.5 font-medium text-(--ink)">
						<Link
							to="/subscriptions/$subscriptionId"
							params={{ subscriptionId: invoice.subscriptionId }}
							className="text-(--brand) hover:underline"
						>
							{invoice.planName}
						</Link>
					</p>
				</div>
				<div>
					<p className="m-0 text-(--ink-3)">Created</p>
					<p className="m-0 mt-0.5 font-medium text-(--ink)">
						{formatDate(invoice.createdAt)}
					</p>
				</div>
			</div>

			<div className="grid gap-4 pt-6 sm:grid-cols-3">
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Gross</p>
						<p className="mt-1 text-lg font-semibold text-(--ink)">
							{formatNGN(invoice.grossKobo)}
						</p>
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Platform fee</p>
						<p className="mt-1 text-lg font-semibold text-(--ink)">
							{invoice.status === "paid" ? formatNGN(invoice.feeKobo) : "—"}
						</p>
						{invoice.status === "paid" &&
							invoice.feeBpsApplied != null &&
							invoice.feeFixedApplied != null && (
								<Tooltip>
									<TooltipTrigger asChild>
										<p className="mt-0.5 cursor-help text-xs text-(--ink-3) underline decoration-dotted underline-offset-2">
											{invoice.feeBpsApplied / 100}% +{" "}
											{formatNGN(invoice.feeFixedApplied)} fixed
										</p>
									</TooltipTrigger>
									<TooltipContent>
										SubPilot charged {invoice.feeBpsApplied / 100}% +{" "}
										{formatNGN(invoice.feeFixedApplied)} on this invoice.
									</TooltipContent>
								</Tooltip>
							)}
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Net</p>
						<p className="mt-1 text-lg font-semibold text-(--ink)">
							{invoice.status === "paid" ? formatNGN(invoice.netKobo) : "—"}
						</p>
					</CardContent>
				</Card>
			</div>

			{refunds.length > 0 && (
				<div className="pt-6">
					<p className="island-kicker m-0 mb-2">Refunds</p>
					<Card className="border border-(--line) bg-(--surface-1) shadow-none">
						<CardContent className="flex flex-col divide-y divide-(--line) py-0">
							{refunds.map((refund) => (
								<div
									key={refund.id}
									className="flex items-center justify-between gap-3 py-3 first:pt-4 last:pb-4"
								>
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
										{refund.status === "failed" && refund.failureReason && (
											<p className="m-0 mt-0.5 text-xs text-destructive">
												{refund.failureReason}
											</p>
										)}
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

			<Dialog open={refundOpen} onOpenChange={setRefundOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Refund this invoice?</DialogTitle>
						<DialogDescription>
							Leave the amount blank to refund the full{" "}
							{formatNGN(invoice.grossKobo)}.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<Field>
							<FieldLabel htmlFor="refund-amount">Amount (optional)</FieldLabel>
							<AmountInput
								id="refund-amount"
								value={refundAmountKobo}
								onChange={setRefundAmountKobo}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="refund-reason">Reason (optional)</FieldLabel>
							<Textarea
								id="refund-reason"
								value={refundReason}
								onChange={(e) => setRefundReason(e.target.value)}
								placeholder="Why is this being refunded?"
								className="border-(--line) bg-(--surface)"
							/>
						</Field>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRefundOpen(false)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => refundMutation.mutate()}
							disabled={refundMutation.isPending}
						>
							{refundMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Refunding…
								</>
							) : (
								"Refund invoice"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={voidOpen} onOpenChange={setVoidOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Void this invoice?</DialogTitle>
						<DialogDescription>
							Voiding stops collection. It does not refund.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setVoidOpen(false)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => voidMutation.mutate()}
							disabled={voidMutation.isPending}
						>
							{voidMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Voiding…
								</>
							) : (
								"Void invoice"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
