import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Empty, EmptyHeader, EmptyTitle } from "#/components/ui/empty.tsx";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet.tsx";
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
	invoices as allInvoices,
	type Invoice,
	type InvoiceStatus,
} from "#/data/invoices.ts";
import { resolvePortalToken } from "#/data/portal.ts";
import type { Subscription } from "#/data/subscriptions.ts";
import { formatNGN } from "#/lib/currency.ts";

export const Route = createFileRoute("/portal/$token/invoices")({
	component: PortalInvoicesPage,
	head: () => ({ meta: [{ title: "Invoices | SubPilot" }] }),
});

const statusLabel: Record<InvoiceStatus, string> = {
	paid: "Paid",
	open: "Open",
	void: "Void",
	failed: "Payment pending",
};

const statusTone: Record<InvoiceStatus, "success" | "warning" | "neutral"> = {
	paid: "success",
	open: "warning",
	void: "neutral",
	failed: "warning",
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function emptyStateCopy(subscription: Subscription): string {
	if (subscription.status === "trialing") {
		return "No invoices yet. Your first invoice will appear after your trial ends.";
	}
	const daysSinceCreated =
		(Date.now() - new Date(subscription.createdAt).getTime()) /
		(1000 * 60 * 60 * 24);
	if (daysSinceCreated < 30) {
		return "No invoices yet. Invoices appear after each billing cycle.";
	}
	return "No invoices found.";
}

function PortalInvoicesPage() {
	const { token } = Route.useParams();
	const context = resolvePortalToken(token);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	if (!context) return null;
	const { subscription } = context;

	const invoices = allInvoices
		.filter((i) => i.subscriptionId === subscription.id)
		.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

	const selectedInvoice = invoices.find((i) => i.id === selectedId) ?? null;

	return (
		<div className="flex flex-col gap-5">
			<h1 className="text-xl font-semibold tracking-tight text-(--ink)">
				Invoices
			</h1>

			{invoices.length === 0 ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							{emptyStateCopy(subscription)}
						</EmptyTitle>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					{/* Desktop table */}
					<div className="hidden overflow-hidden rounded-2xl border border-(--line) bg-(--surface-1) md:block">
						<Table>
							<TableHeader>
								<TableRow className="border-(--line) hover:bg-transparent">
									<TableHead className="text-(--ink-3)">Date</TableHead>
									<TableHead className="text-(--ink-3)">Invoice</TableHead>
									<TableHead className="text-(--ink-3)">Amount</TableHead>
									<TableHead className="text-(--ink-3)">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{invoices.map((invoice) => (
									<TableRow
										key={invoice.id}
										onClick={() => setSelectedId(invoice.id)}
										className="cursor-pointer border-(--line) hover:bg-(--surface-2)"
									>
										<TableCell className="text-(--ink-3)">
											{formatDate(invoice.createdAt)}
										</TableCell>
										<TableCell className="font-heading text-xs text-(--ink)">
											{invoice.number}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{formatNGN(invoice.grossKobo)}
										</TableCell>
										<TableCell>
											<StatusBadge tone={statusTone[invoice.status]}>
												{statusLabel[invoice.status]}
											</StatusBadge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Mobile cards */}
					<div className="flex flex-col gap-3 md:hidden">
						{invoices.map((invoice) => (
							<button
								key={invoice.id}
								type="button"
								onClick={() => setSelectedId(invoice.id)}
								className="flex flex-col gap-1.5 rounded-2xl border border-(--line) bg-(--surface-1) p-4 text-left"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="text-sm text-(--ink-3)">
										{formatDate(invoice.createdAt)}
									</span>
									<StatusBadge tone={statusTone[invoice.status]}>
										{statusLabel[invoice.status]}
									</StatusBadge>
								</div>
								<div className="text-base font-medium text-(--ink)">
									{formatNGN(invoice.grossKobo)}
								</div>
								<div className="font-heading text-xs text-(--ink-3)">
									{invoice.number}
								</div>
							</button>
						))}
					</div>
				</>
			)}

			<Sheet
				open={selectedId !== null}
				onOpenChange={(open) => !open && setSelectedId(null)}
			>
				<SheetContent
					side="right"
					className="w-full border-(--line) bg-(--surface-1) sm:max-w-96"
				>
					{selectedInvoice && <InvoiceDetail invoice={selectedInvoice} />}
				</SheetContent>
			</Sheet>
		</div>
	);
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
	return (
		<>
			<SheetHeader className="pb-4">
				<SheetTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
					{invoice.number}
				</SheetTitle>
				<SheetDescription className="text-(--ink-2)">
					{formatDate(invoice.createdAt)}
				</SheetDescription>
			</SheetHeader>
			<div className="flex flex-col gap-4 px-8 pb-8">
				<div>
					<p className="m-0 text-(--ink-3)">Amount</p>
					<p className="m-0 mt-0.5 text-lg font-semibold text-(--ink)">
						{formatNGN(invoice.grossKobo)}
					</p>
				</div>
				<div>
					<p className="m-0 text-(--ink-3)">Status</p>
					<div className="mt-1">
						<StatusBadge tone={statusTone[invoice.status]}>
							{statusLabel[invoice.status]}
						</StatusBadge>
					</div>
					{invoice.status === "failed" && (
						<p className="mt-1.5 text-sm text-(--ink-3)">
							We'll try again soon.
						</p>
					)}
				</div>
			</div>
		</>
	);
}
