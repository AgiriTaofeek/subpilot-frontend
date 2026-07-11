import { useSuspenseQuery } from "@tanstack/react-query";
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
import { invoiceStatusLabel, invoiceStatusTone } from "#/data/invoices.ts";
import { portalInvoicesQueryOptions } from "#/data/portal.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatDate } from "#/lib/date.ts";
import type { PortalInvoiceViewDto } from "#/types/api.ts";

export const Route = createFileRoute("/portal/$token/invoices")({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			portalInvoicesQueryOptions(params.token),
		);
	},
	component: PortalInvoicesPage,
	head: () => ({ meta: [{ title: "Invoices | SubPilot" }] }),
});

function PortalInvoicesPage() {
	const { token } = Route.useParams();
	const { data: invoices } = useSuspenseQuery(
		portalInvoicesQueryOptions(token),
	);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const selectedInvoice =
		invoices.find((i) => i.invoiceId === selectedId) ?? null;

	return (
		<div className="flex flex-col gap-5">
			<h1 className="text-xl font-semibold tracking-tight text-(--ink)">
				Invoices
			</h1>

			{invoices.length === 0 ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No invoices found.
						</EmptyTitle>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					{/* Desktop table */}
					<div className="hidden overflow-hidden border border-(--line) bg-(--surface-1) md:block">
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
										key={invoice.invoiceId}
										onClick={() => setSelectedId(invoice.invoiceId)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												setSelectedId(invoice.invoiceId);
											}
										}}
										tabIndex={0}
										role="button"
										aria-label={`View invoice ${invoice.invoiceNumber}`}
										className="cursor-pointer border-(--line) hover:bg-(--surface-2) focus-visible:outline-2 focus-visible:outline-(--brand) focus-visible:-outline-offset-2"
									>
										<TableCell className="text-(--ink-3)">
											{formatDate(invoice.dueDate)}
										</TableCell>
										<TableCell className="font-heading text-xs text-(--ink)">
											{invoice.invoiceNumber}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{formatNGN(invoice.amount)}
										</TableCell>
										<TableCell>
											<StatusBadge tone={invoiceStatusTone[invoice.status]}>
												{invoiceStatusLabel[invoice.status]}
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
								key={invoice.invoiceId}
								type="button"
								onClick={() => setSelectedId(invoice.invoiceId)}
								className="flex flex-col gap-1.5 rounded-2xl border border-(--line) bg-(--surface-1) p-4 text-left"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="text-sm text-(--ink-3)">
										{formatDate(invoice.dueDate)}
									</span>
									<StatusBadge tone={invoiceStatusTone[invoice.status]}>
										{invoiceStatusLabel[invoice.status]}
									</StatusBadge>
								</div>
								<div className="text-base font-medium text-(--ink)">
									{formatNGN(invoice.amount)}
								</div>
								<div className="font-heading text-xs text-(--ink-3)">
									{invoice.invoiceNumber}
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

function InvoiceDetail({ invoice }: { invoice: PortalInvoiceViewDto }) {
	return (
		<>
			<SheetHeader className="pb-4">
				<SheetTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
					{invoice.invoiceNumber}
				</SheetTitle>
				<SheetDescription className="text-(--ink-2)">
					{formatDate(invoice.dueDate)}
				</SheetDescription>
			</SheetHeader>
			<div className="flex flex-col gap-4 px-8 pb-8">
				<div>
					<p className="m-0 text-(--ink-3)">Amount</p>
					<p className="m-0 mt-0.5 text-lg font-semibold text-(--ink)">
						{formatNGN(invoice.amount)}
					</p>
				</div>
				<div>
					<p className="m-0 text-(--ink-3)">Status</p>
					<div className="mt-1">
						<StatusBadge tone={invoiceStatusTone[invoice.status]}>
							{invoiceStatusLabel[invoice.status]}
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
