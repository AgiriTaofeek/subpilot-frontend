import { FunnelIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { z } from "zod";

import { Button } from "#/components/ui/button.tsx";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
import { Input } from "#/components/ui/input.tsx";
import { PageSizeSelect } from "#/components/ui/page-size-select.tsx";
import { ListPageSkeleton } from "#/components/ui/page-skeleton.tsx";
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
	INVOICES_PAGE_SIZE,
	type InvoiceSummary,
	invoiceStatusLabel,
	invoiceStatusTone,
	invoicesListPageQueryOptions,
} from "#/data/invoices.ts";
import { useDebouncedSearchInput } from "#/hooks/use-debounced-search-input.ts";
import { activatableRowProps } from "#/lib/activatable-row.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatDate } from "#/lib/date.ts";
import { pageSizeSchema } from "#/lib/pagination-sizes.ts";
import type { InvoiceStatusDto } from "#/types/api.ts";

const statusValues = ["pending", "paid", "failed", "void", "refunded"] as const;

const defaultInvoicesSearch = { page: 1, q: "", size: INVOICES_PAGE_SIZE };

const invoicesSearchSchema = z.object({
	page: z.number().default(defaultInvoicesSearch.page),
	status: z.enum(statusValues).optional().catch(undefined),
	q: z.string().default(defaultInvoicesSearch.q),
	size: pageSizeSchema(defaultInvoicesSearch.size),
});

export const Route = createFileRoute("/_dashboard/invoices/")({
	validateSearch: invoicesSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultInvoicesSearch)],
	},
	loaderDeps: ({ search }) => ({
		page: search.page,
		status: search.status,
		q: search.q,
		size: search.size,
	}),
	loader: ({ context, deps }) => {
		// Not awaited — see events.tsx for why.
		void context.queryClient.prefetchQuery(invoicesListPageQueryOptions(deps));
	},
	component: InvoicesListPage,
	pendingComponent: () => <ListPageSkeleton columns={5} />,
	head: () => ({ meta: [{ title: "Invoices | SubPilot" }] }),
});

const statusFilters: Array<{ value: InvoiceStatusDto; label: string }> =
	statusValues.map((value) => ({ value, label: invoiceStatusLabel[value] }));

function isOverdue(invoice: InvoiceSummary): boolean {
	if (invoice.status !== "pending") return false;
	const ageDays =
		(Date.now() - new Date(invoice.createdAt).getTime()) /
		(1000 * 60 * 60 * 24);
	return ageDays > 7;
}

function rowTone(invoice: InvoiceSummary): "failed" | "void" | "default" {
	if (invoice.status === "failed") return "failed";
	if (invoice.status === "void") return "void";
	return "default";
}

function InvoicesListPage() {
	const { page, status, q, size } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: invoicesPage, isPlaceholderData } = useQuery(
		invoicesListPageQueryOptions({ page, status, q, size }),
	);

	function handleSizeChange(nextSize: number) {
		navigate({
			search: (prev) => ({ ...prev, size: nextSize, page: 1 }),
			resetScroll: false,
		});
	}

	function handleStatusFilterChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				status: (value || undefined) as InvoiceStatusDto | undefined,
				page: 1,
			}),
			resetScroll: false,
		});
	}

	const [searchInput, setSearchInput] = useDebouncedSearchInput(q, (value) => {
		navigate({
			search: (prev) => ({ ...prev, q: value, page: 1 }),
			replace: true,
			resetScroll: false,
		});
	});

	function goToInvoice(invoiceId: string) {
		navigate({ to: "/invoices/$invoiceId", params: { invoiceId } });
	}

	const invoices = invoicesPage?.content ?? [];

	const columns = useMemo<ColumnDef<InvoiceSummary>[]>(
		() => [
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
							{row.original.planName}
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
							navigate({
								to: "/invoices/$invoiceId",
								params: { invoiceId: row.original.id },
							});
						}}
						className="text-(--ink-3) hover:text-(--ink)"
					>
						View
					</Button>
				),
			},
		],
		[navigate],
	);

	const table = useReactTable({
		data: invoices,
		columns,
		getRowId: (row) => row.id,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount: Math.max(1, invoicesPage?.totalPages ?? 1),
		state: {
			pagination: { pageIndex: page - 1, pageSize: size },
		},
		onPaginationChange: (updater) => {
			const current = { pageIndex: page - 1, pageSize: size };
			const next = typeof updater === "function" ? updater(current) : updater;
			navigate({
				search: (prev) => ({ ...prev, page: next.pageIndex + 1 }),
				resetScroll: false,
			});
		},
	});

	if (!invoicesPage) {
		return <ListPageSkeleton columns={5} />;
	}

	const pageCount = table.getPageCount();
	const hasActiveFilters = Boolean(status || q.trim());
	const isEmpty = invoicesPage.totalElements === 0;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Invoices
			</h1>

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
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className="border-(--line) bg-(--surface) pl-9 pr-3 focus-visible:ring-(--brand)/30"
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
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									className="border-(--line) bg-(--surface) pl-9 pr-3 focus-visible:ring-(--brand)/30"
								/>
							</div>
						</div>
					</SheetContent>
				</Sheet>

				{status && (
					<p className="text-sm text-(--ink-2)">
						{invoicesPage.totalElements} invoice
						{invoicesPage.totalElements === 1 ? "" : "s"}
					</p>
				)}
			</div>

			{isEmpty && !hasActiveFilters ? (
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
				<div
					className={
						isPlaceholderData
							? "flex flex-col gap-6 opacity-50 transition-opacity"
							: "flex flex-col gap-6"
					}
				>
					{/* Desktop table */}
					<div className="hidden overflow-hidden border border-(--line) bg-(--surface-1) md:block">
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
						{invoices.map((invoice) => {
							const tone = rowTone(invoice);
							return (
								<div
									key={invoice.id}
									{...activatableRowProps(() => goToInvoice(invoice.id))}
									className={`flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 ${
										tone === "failed"
											? "border-l-2 border-l-destructive/30 border-(--line) bg-destructive/5"
											: "border-(--line) bg-(--surface-1)"
									}`}
								>
									<div className="flex items-center justify-between gap-2">
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
										className={`text-sm ${
											tone === "void" ? "text-(--ink-3)" : "text-(--ink-2)"
										}`}
									>
										{formatNGN(invoice.grossKobo)}
									</div>
									<div className="text-xs text-(--ink-3)">
										{invoice.customerName} · {formatDate(invoice.createdAt)}
									</div>
								</div>
							);
						})}
					</div>

					<div className="flex items-center justify-between gap-3">
						<PageSizeSelect value={size} onChange={handleSizeChange} />
						{pageCount > 1 && (
							<Pagination className="w-auto flex-1 justify-end">
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
									{Array.from({ length: pageCount }, (_, i) => i + 1).map(
										(p) => (
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
										),
									)}
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
					</div>
				</div>
			)}
		</div>
	);
}
