import { FunnelIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { z } from "zod";

import { Button } from "#/components/ui/button.tsx";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "#/components/ui/pagination.tsx";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
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
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group.tsx";
import {
	invoices as allInvoices,
	type Invoice,
	type InvoiceStatus,
	invoiceStatusLabel,
	invoiceStatusTone,
} from "#/data/invoices.ts";
import { planNameFor, subscriptions } from "#/data/subscriptions.ts";
import { formatNGN } from "#/lib/currency.ts";

const statusValues = ["paid", "open", "void", "failed"] as const;

const defaultInvoicesSearch = { page: 1, q: "" };

const invoicesSearchSchema = z.object({
	page: z.number().default(defaultInvoicesSearch.page),
	status: z.enum(statusValues).optional().catch(undefined),
	q: z.string().default(defaultInvoicesSearch.q),
});

export const Route = createFileRoute("/_dashboard/invoices/")({
	validateSearch: invoicesSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultInvoicesSearch)],
	},
	component: InvoicesListPage,
	head: () => ({ meta: [{ title: "Invoices | SubPilot" }] }),
});

const PAGE_SIZE = 10;

const statusFilters: Array<{ value: InvoiceStatus; label: string }> =
	statusValues.map((value) => ({ value, label: invoiceStatusLabel[value] }));

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function isOverdue(invoice: Invoice): boolean {
	if (invoice.status !== "open") return false;
	const ageDays =
		(Date.now() - new Date(invoice.createdAt).getTime()) /
		(1000 * 60 * 60 * 24);
	return ageDays > 7;
}

function planNameForInvoice(invoice: Invoice): string {
	const sub = subscriptions.find((s) => s.id === invoice.subscriptionId);
	return sub ? planNameFor(sub.planId) : "—";
}

function rowTone(invoice: Invoice): "failed" | "void" | "default" {
	if (invoice.status === "failed") return "failed";
	if (invoice.status === "void") return "void";
	return "default";
}

function InvoicesListPage() {
	const { page, status, q } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	function handleStatusFilterChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				status: (value || undefined) as InvoiceStatus | undefined,
				page: 1,
			}),
			resetScroll: false,
		});
	}

	function handleSearchChange(value: string) {
		navigate({
			search: (prev) => ({ ...prev, q: value, page: 1 }),
			replace: true,
			resetScroll: false,
		});
	}

	function goToInvoice(invoiceId: string) {
		navigate({ to: "/invoices/$invoiceId", params: { invoiceId } });
	}

	const filtered = allInvoices
		.filter((i) => !status || i.status === status)
		.filter((i) => {
			const query = q.trim().toLowerCase();
			if (!query) return true;
			return (
				i.number.toLowerCase().includes(query) ||
				i.customerEmail.toLowerCase().includes(query)
			);
		})
		.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

	const summaryGross = filtered.reduce((sum, i) => sum + i.grossKobo, 0);

	const columns: ColumnDef<Invoice>[] = [
		{
			id: "number",
			header: "Invoice",
			cell: ({ row }) => {
				const dim = rowTone(row.original) === "void";
				return (
					<span
						className={`font-heading text-xs ${dim ? "text-(--ink-3)" : "text-(--ink)"}`}
					>
						{row.original.number}
					</span>
				);
			},
		},
		{
			id: "customer",
			header: "Customer",
			cell: ({ row }) => {
				const dim = rowTone(row.original) === "void";
				return (
					<div>
						<p
							className={`m-0 ${dim ? "text-(--ink-3)" : "font-medium text-(--ink)"}`}
						>
							{row.original.customerName}
						</p>
						<p className="m-0 text-xs text-(--ink-3)">
							{row.original.customerEmail}
						</p>
					</div>
				);
			},
		},
		{
			id: "subscription",
			header: "Subscription",
			cell: ({ row }) => {
				const dim = rowTone(row.original) === "void";
				return (
					<span className={dim ? "text-(--ink-3)" : "text-(--ink-2)"}>
						{planNameForInvoice(row.original)}
					</span>
				);
			},
		},
		{
			id: "status",
			header: "Status",
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<StatusBadge tone={invoiceStatusTone[row.original.status]}>
						{invoiceStatusLabel[row.original.status]}
					</StatusBadge>
					{isOverdue(row.original) && (
						<span className="text-xs text-(--ink-3)">overdue</span>
					)}
				</div>
			),
		},
		{
			id: "gross",
			header: "Gross",
			cell: ({ row }) => {
				const dim = rowTone(row.original) === "void";
				return (
					<span className={dim ? "text-(--ink-3)" : "text-(--ink-2)"}>
						{formatNGN(row.original.grossKobo)}
					</span>
				);
			},
		},
		{
			id: "fee",
			header: "Fee",
			cell: ({ row }) => {
				const dim = rowTone(row.original) === "void";
				return (
					<span className={dim ? "text-(--ink-3)" : "text-(--ink-2)"}>
						{row.original.status === "paid"
							? formatNGN(row.original.feeKobo)
							: "—"}
					</span>
				);
			},
		},
		{
			id: "net",
			header: "Net",
			cell: ({ row }) => {
				const dim = rowTone(row.original) === "void";
				return (
					<span className={dim ? "text-(--ink-3)" : "text-(--ink)"}>
						{row.original.status === "paid"
							? formatNGN(row.original.netKobo)
							: "—"}
					</span>
				);
			},
		},
		{
			id: "createdAt",
			header: "Created",
			cell: ({ row }) => (
				<span className="text-(--ink-3)">
					{formatDate(row.original.createdAt)}
				</span>
			),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<Button
					variant="ghost"
					size="sm"
					onClick={(e) => {
						e.stopPropagation();
						goToInvoice(row.original.id);
					}}
					className="text-(--ink-3) hover:text-(--ink)"
				>
					View
				</Button>
			),
		},
	];

	const table = useReactTable({
		data: filtered,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		state: {
			pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE },
		},
		onPaginationChange: (updater) => {
			const current = { pageIndex: page - 1, pageSize: PAGE_SIZE };
			const next = typeof updater === "function" ? updater(current) : updater;
			navigate({
				search: (prev) => ({ ...prev, page: next.pageIndex + 1 }),
				resetScroll: false,
			});
		},
	});

	const paginatedInvoices = table.getRowModel().rows.map((row) => row.original);
	const pageCount = table.getPageCount();
	const hasAnyInvoices = allInvoices.length > 0;
	const isEmpty = filtered.length === 0;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Invoices
			</h1>

			{hasAnyInvoices && (
				<div className="flex flex-col gap-3">
					<ToggleGroup
						type="single"
						variant="outline"
						size="sm"
						value={status ?? ""}
						onValueChange={handleStatusFilterChange}
						className="overflow-x-auto"
					>
						{statusFilters.map((f) => (
							<ToggleGroupItem
								key={f.value}
								value={f.value}
								className="rounded-full border-(--line) px-4 text-xs font-medium normal-case tracking-normal data-[state=on]:bg-(--surface-2) data-[state=on]:text-(--ink)"
							>
								{f.label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>

					{/* Desktop: search inline */}
					<div className="hidden sm:flex">
						<div className="relative w-full max-w-64">
							<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--ink-3)" />
							<Input
								placeholder="Search invoice # or email…"
								value={q}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="border-(--line) bg-(--surface) pl-9 focus-visible:ring-(--brand)/30"
							/>
						</div>
					</div>

					{/* Mobile: Filters sheet */}
					<Sheet>
						<SheetTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="w-fit border-(--line) sm:hidden"
							>
								<FunnelIcon data-icon="inline-start" />
								Filters
							</Button>
						</SheetTrigger>
						<SheetContent
							side="right"
							className="w-88 border-(--line) bg-(--surface-1)"
						>
							<SheetHeader className="pb-4">
								<SheetTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
									Filters
								</SheetTitle>
							</SheetHeader>
							<div className="flex flex-col gap-4 px-8 pb-8">
								<div className="relative w-full">
									<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--ink-3)" />
									<Input
										placeholder="Search invoice # or email…"
										value={q}
										onChange={(e) => handleSearchChange(e.target.value)}
										className="border-(--line) bg-(--surface) pl-9 focus-visible:ring-(--brand)/30"
									/>
								</div>
							</div>
						</SheetContent>
					</Sheet>

					{status && (
						<p className="text-sm text-(--ink-2)">
							{formatNGN(summaryGross)} total gross · {filtered.length} invoice
							{filtered.length === 1 ? "" : "s"}
						</p>
					)}
				</div>
			)}

			{!hasAnyInvoices ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No invoices yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Invoices appear here after checkout and renewals.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : isEmpty ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No invoices match your filters
						</EmptyTitle>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					{/* Desktop table */}
					<div className="hidden overflow-hidden rounded-2xl border border-(--line) bg-(--surface-1) md:block">
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow
										key={headerGroup.id}
										className="border-(--line) hover:bg-transparent"
									>
										{headerGroup.headers.map((header) => (
											<TableHead key={header.id} className="text-(--ink-3)">
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows.map((row) => {
									const tone = rowTone(row.original);
									return (
										<TableRow
											key={row.id}
											onClick={() => goToInvoice(row.original.id)}
											className={`cursor-pointer border-(--line) hover:bg-(--surface-2) ${
												tone === "failed"
													? "border-l-2 border-l-destructive/30 bg-destructive/5"
													: ""
											}`}
										>
											{row.getVisibleCells().map((cell) => (
												<TableCell key={cell.id}>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											))}
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>

					{/* Mobile cards */}
					<div className="flex flex-col gap-3 md:hidden">
						{paginatedInvoices.map((invoice) => {
							const tone = rowTone(invoice);
							return (
								<div
									key={invoice.id}
									className={`relative flex flex-col gap-2 rounded-2xl border p-4 ${
										tone === "failed"
											? "border-l-2 border-l-destructive/30 border-(--line) bg-destructive/5"
											: "border-(--line) bg-(--surface-1)"
									}`}
								>
									<button
										type="button"
										onClick={() => goToInvoice(invoice.id)}
										aria-label={`View invoice ${invoice.number}`}
										className="absolute inset-0 z-0 rounded-2xl"
									/>
									<div className="relative z-10 flex items-center justify-between gap-2">
										<span
											className={`font-heading text-xs ${
												tone === "void" ? "text-(--ink-3)" : "text-(--ink)"
											}`}
										>
											{invoice.number}
										</span>
										<div className="flex items-center gap-2">
											<StatusBadge tone={invoiceStatusTone[invoice.status]}>
												{invoiceStatusLabel[invoice.status]}
											</StatusBadge>
											{isOverdue(invoice) && (
												<span className="text-xs text-(--ink-3)">overdue</span>
											)}
										</div>
									</div>
									<div
										className={`relative z-10 text-sm ${
											tone === "void" ? "text-(--ink-3)" : "text-(--ink-2)"
										}`}
									>
										{formatNGN(invoice.grossKobo)}
									</div>
									<div className="relative z-10 text-xs text-(--ink-3)">
										{invoice.customerName} · {formatDate(invoice.createdAt)}
									</div>
								</div>
							);
						})}
					</div>

					{pageCount > 1 && (
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious
										from={Route.fullPath}
										search={(prev) => ({
											...prev,
											page: Math.max(1, page - 1),
										})}
										resetScroll={false}
										aria-disabled={page <= 1}
										className={
											page <= 1 ? "pointer-events-none opacity-50" : undefined
										}
									/>
								</PaginationItem>
								{Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
									<PaginationItem key={p}>
										<PaginationLink
											from={Route.fullPath}
											search={(prev) => ({ ...prev, page: p })}
											resetScroll={false}
											isActive={p === page}
										>
											{p}
										</PaginationLink>
									</PaginationItem>
								))}
								<PaginationItem>
									<PaginationNext
										from={Route.fullPath}
										search={(prev) => ({
											...prev,
											page: Math.min(pageCount, page + 1),
										})}
										resetScroll={false}
										aria-disabled={page >= pageCount}
										className={
											page >= pageCount
												? "pointer-events-none opacity-50"
												: undefined
										}
									/>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					)}
				</>
			)}
		</div>
	);
}
