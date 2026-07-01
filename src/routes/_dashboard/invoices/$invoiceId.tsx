import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
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
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip.tsx";
import { customers } from "#/data/customers.ts";
import {
	invoices as allInvoices,
	type Invoice,
	type InvoiceStatus,
	invoiceStatusLabel,
	invoiceStatusTone,
} from "#/data/invoices.ts";
import {
	type PaymentAttemptStatus,
	paymentAttemptsFor,
} from "#/data/payment-attempts.ts";
import { planNameFor } from "#/data/subscriptions.ts";
import { formatNGN } from "#/lib/currency.ts";

export const Route = createFileRoute("/_dashboard/invoices/$invoiceId")({
	component: InvoiceDetailPage,
	head: () => ({ meta: [{ title: "Invoice | SubPilot" }] }),
});

const attemptStatusTone: Record<
	PaymentAttemptStatus,
	"success" | "warning" | "danger"
> = {
	succeeded: "success",
	retrying: "warning",
	failed: "danger",
};

const attemptStatusLabel: Record<PaymentAttemptStatus, string> = {
	succeeded: "Succeeded",
	retrying: "Retrying",
	failed: "Failed",
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
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
	status: InvoiceStatus,
): "enabled" | "disabled" | "hidden" {
	if (status === "open") return "enabled";
	if (status === "paid") return "disabled";
	return "hidden";
}

function InvoiceDetailPage() {
	const { invoiceId } = Route.useParams();
	const [invoice, setInvoice] = useState<Invoice | undefined>(() =>
		allInvoices.find((i) => i.id === invoiceId),
	);
	const [voidOpen, setVoidOpen] = useState(false);

	if (!invoice) {
		return (
			<div className="flex flex-1 items-center justify-center p-10">
				<Empty className="max-w-sm rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							Invoice not found
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							This invoice may have been removed or the link is incorrect.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild variant="outline" className="border-(--line)">
							<Link to="/invoices">Back to invoices</Link>
						</Button>
					</EmptyContent>
				</Empty>
			</div>
		);
	}

	const customer = customers.find((c) => c.email === invoice.customerEmail);
	const attempts = paymentAttemptsFor(invoice.id);
	const voidState = voidButtonState(invoice.status);
	const feePercent = Math.round(invoice.grossKobo * 0.015);

	function handleVoid() {
		setInvoice((prev) => (prev ? { ...prev, status: "void" } : prev));
		setVoidOpen(false);
		toast.success("Invoice voided");
	}

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
						{customer ? (
							<Link
								to="/customers/$customerId"
								params={{ customerId: customer.id }}
								className="text-(--brand) hover:underline"
							>
								{invoice.customerName}
							</Link>
						) : (
							invoice.customerName
						)}
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
							{planNameFor(invoice.subscriptionId)}
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

			<Card className="mt-6 border border-(--line) bg-(--surface-1) shadow-none">
				<CardHeader>
					<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
						Payment attempts
					</CardTitle>
				</CardHeader>
				<CardContent>
					{attempts.length === 0 ? (
						<p className="m-0 text-sm text-(--ink-3)">
							No payment attempts yet.
						</p>
					) : (
						<>
							{/* Desktop table */}
							<div className="hidden overflow-hidden rounded-md border border-(--line) md:block">
								<Table>
									<TableHeader>
										<TableRow className="border-(--line) hover:bg-transparent">
											<TableHead className="text-(--ink-3)">
												Timestamp
											</TableHead>
											<TableHead className="text-(--ink-3)">Status</TableHead>
											<TableHead className="text-(--ink-3)">
												Reference
											</TableHead>
											<TableHead className="text-(--ink-3)">
												Failure reason
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{attempts.map((attempt) => (
											<TableRow
												key={attempt.attemptNumber}
												className="border-(--line)"
											>
												<TableCell className="text-(--ink-3)">
													{formatDateTime(attempt.timestamp)}
												</TableCell>
												<TableCell>
													<StatusBadge tone={attemptStatusTone[attempt.status]}>
														{attemptStatusLabel[attempt.status]}
													</StatusBadge>
												</TableCell>
												<TableCell className="font-heading text-xs text-(--ink-2)">
													{attempt.reference}
												</TableCell>
												<TableCell className="text-(--ink-2)">
													{attempt.failureReason ?? "—"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Mobile: attempt timeline */}
							<div className="flex flex-col gap-3 border-l-2 border-(--line) pl-4 md:hidden">
								{attempts.map((attempt) => (
									<div key={attempt.attemptNumber}>
										<p className="m-0 text-sm text-(--ink)">
											Attempt {attempt.attemptNumber} ·{" "}
											{formatDateTime(attempt.timestamp)}
										</p>
										<div className="mt-1 flex items-center gap-2">
											<StatusBadge tone={attemptStatusTone[attempt.status]}>
												{attemptStatusLabel[attempt.status]}
											</StatusBadge>
											{attempt.failureReason && (
												<span className="text-xs text-(--ink-3)">
													{attempt.failureReason}
												</span>
											)}
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>

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
						<Button variant="destructive" onClick={handleVoid}>
							Void invoice
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
