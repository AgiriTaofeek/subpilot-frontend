import { MagnifyingGlassIcon } from "@phosphor-icons/react";
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
	CUSTOMERS_PAGE_SIZE,
	type CustomerSummary,
	customersListQueryOptions,
} from "#/data/customers.ts";
import {
	subscriptionStatusLabel,
	subscriptionStatusTone,
} from "#/data/subscriptions.ts";
import { useDebouncedSearchInput } from "#/hooks/use-debounced-search-input.ts";
import { activatableRowProps } from "#/lib/activatable-row.ts";
import { formatDate } from "#/lib/date.ts";
import { pageSizeSchema } from "#/lib/pagination-sizes.ts";

const defaultCustomersSearch = {
	page: 1,
	q: "",
	size: CUSTOMERS_PAGE_SIZE,
};

const customersSearchSchema = z.object({
	page: z.number().default(defaultCustomersSearch.page),
	q: z.string().default(defaultCustomersSearch.q),
	size: pageSizeSchema(defaultCustomersSearch.size),
});

export const Route = createFileRoute("/_dashboard/customers/")({
	validateSearch: customersSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultCustomersSearch)],
	},
	loaderDeps: ({ search }) => ({
		page: search.page,
		q: search.q,
		size: search.size,
	}),
	loader: ({ context, deps }) => {
		// Not awaited — see events.tsx for why.
		void context.queryClient.prefetchQuery(customersListQueryOptions(deps));
	},
	component: CustomersListPage,
	pendingComponent: () => <ListPageSkeleton columns={4} />,
	head: () => ({ meta: [{ title: "Customers | SubPilot" }] }),
});

function SubscriptionSummary({
	summary,
}: {
	summary: CustomerSummary["subscriptionSummary"];
}) {
	if (summary.length === 0) {
		return <span className="text-sm text-(--ink-3)">No subscriptions</span>;
	}
	return (
		<div className="flex flex-wrap gap-1.5">
			{summary.map(({ status, count }) => (
				<StatusBadge key={status} tone={subscriptionStatusTone[status]}>
					{count} {subscriptionStatusLabel[status].toLowerCase()}
				</StatusBadge>
			))}
		</div>
	);
}

function CustomersListPage() {
	const { page, q, size } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: customersPage, isPlaceholderData } = useQuery(
		customersListQueryOptions({ q, page, size }),
	);

	function handleSizeChange(nextSize: number) {
		navigate({
			search: (prev) => ({ ...prev, size: nextSize, page: 1 }),
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

	function goToCustomer(customerId: string) {
		navigate({ to: "/customers/$customerId", params: { customerId } });
	}

	const customers = customersPage?.content ?? [];

	const columns = useMemo<ColumnDef<CustomerSummary>[]>(
		() => [
			{
				id: "name",
				header: "Name",
				cell: ({ row }) => (
					<div>
						<p className="m-0 font-medium text-(--ink)">{row.original.name}</p>
						<p className="m-0 text-xs text-(--ink-3)">{row.original.email}</p>
					</div>
				),
			},
			{
				id: "phone",
				header: "Phone",
				cell: ({ row }) => (
					<span className="text-(--ink-2)">{row.original.phone}</span>
				),
			},
			{
				id: "card",
				header: "Card",
				cell: ({ row }) => (
					<span className="text-(--ink-2)">
						{row.original.cardBrand} •••• {row.original.cardLast4}
					</span>
				),
			},
			{
				id: "subscriptions",
				header: "Subscriptions",
				cell: ({ row }) => (
					<SubscriptionSummary summary={row.original.subscriptionSummary} />
				),
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
								to: "/customers/$customerId",
								params: { customerId: row.original.id },
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
		data: customers,
		columns,
		getRowId: (row) => row.id,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount: Math.max(1, customersPage?.totalPages ?? 1),
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

	if (!customersPage) {
		return <ListPageSkeleton columns={4} />;
	}

	const pageCount = table.getPageCount();
	const hasActiveFilters = Boolean(q.trim());
	const isEmpty = customersPage.totalElements === 0;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Customers
			</h1>

			{(customers.length > 0 || hasActiveFilters) && (
				<div className="relative w-full sm:max-w-80">
					<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--ink-3)" />
					<Input
						placeholder="Search name, email, or phone…"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="border-(--line) bg-(--surface) pl-9 pr-3 focus-visible:ring-(--brand)/30"
					/>
				</div>
			)}

			{isEmpty ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							{hasActiveFilters
								? "No customers match your search"
								: "No customers yet"}
						</EmptyTitle>
						{!hasActiveFilters && (
							<EmptyDescription className="text-(--ink-3)">
								Customers are created automatically when a subscriber completes
								checkout.
							</EmptyDescription>
						)}
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
								{table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										onClick={() => goToCustomer(row.original.id)}
										className="cursor-pointer border-(--line) hover:bg-(--surface-2)"
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
								))}
							</TableBody>
						</Table>
					</div>

					{/* Mobile cards */}
					<div className="flex flex-col gap-3 md:hidden">
						{customers.map((customer) => (
							<div
								key={customer.id}
								{...activatableRowProps(() => goToCustomer(customer.id))}
								className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-(--line) bg-(--surface-1) p-4"
							>
								<div>
									<p className="m-0 font-medium text-(--ink)">
										{customer.name}
									</p>
									<p className="m-0 text-xs text-(--ink-3)">{customer.email}</p>
								</div>
								<div className="text-sm text-(--ink-2)">
									{customer.cardBrand} •••• {customer.cardLast4}
								</div>
								<div>
									<SubscriptionSummary summary={customer.subscriptionSummary} />
								</div>
							</div>
						))}
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
