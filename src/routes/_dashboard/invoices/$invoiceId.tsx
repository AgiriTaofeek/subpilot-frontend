import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Spinner } from "#/components/ui/spinner.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip.tsx";
import {
	invoiceDetailQueryOptions,
	invoiceStatusLabel,
	invoiceStatusTone,
} from "#/data/invoices.ts";
import { useHandleMutationError } from "#/hooks/use-handle-mutation-error.ts";
import { voidInvoice } from "#/lib/api/invoices.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatDate } from "#/lib/date.ts";
import type { InvoiceStatusDto } from "#/types/api.ts";

export const Route = createFileRoute("/_dashboard/invoices/$invoiceId")({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			invoiceDetailQueryOptions(params.invoiceId),
		);
	},
	component: InvoiceDetailPage,
	head: () => ({ meta: [{ title: "Invoice | SubPilot" }] }),
});

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

function InvoiceDetailPage() {
	const { invoiceId } = Route.useParams();
	const queryClient = useQueryClient();
	const { data: invoice } = useSuspenseQuery(
		invoiceDetailQueryOptions(invoiceId),
	);
	const [voidOpen, setVoidOpen] = useState(false);
	const handleMutationError = useHandleMutationError();

	const voidState = voidButtonState(invoice.status);
	const feePercent = Math.round(invoice.grossKobo * 0.015);

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
						{invoice.status === "paid" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<p className="mt-0.5 cursor-help text-xs text-(--ink-3) underline decoration-dotted underline-offset-2">
										{formatNGN(feePercent)} (1.5% + ₦100 fixed)
									</p>
								</TooltipTrigger>
								<TooltipContent>
									SubPilot charges 1.5% + ₦100 per successful payment.
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
