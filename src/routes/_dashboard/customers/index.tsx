import { MagnifyingGlassIcon } from "@phosphor-icons/react";
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
	customers as allCustomers,
	type Customer,
	mostRecentSubscriptionUpdate,
	subscriptionSummaryForCustomer,
} from "#/data/customers.ts";
import {
	subscriptionStatusLabel,
	subscriptionStatusTone,
} from "#/data/subscriptions.ts";

const defaultCustomersSearch = { page: 1, q: "" };

const customersSearchSchema = z.object({
	page: z.number().default(defaultCustomersSearch.page),
	q: z.string().default(defaultCustomersSearch.q),
});

export const Route = createFileRoute("/_dashboard/customers/")({
	validateSearch: customersSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultCustomersSearch)],
	},
	component: CustomersListPage,
	head: () => ({ meta: [{ title: "Customers | SubPilot" }] }),
});

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function compareCustomers(a: Customer, b: Customer): number {
	const aUpdated = mostRecentSubscriptionUpdate(a.email);
	const bUpdated = mostRecentSubscriptionUpdate(b.email);
	if (!aUpdated && !bUpdated) return 0;
	if (!aUpdated) return 1;
	if (!bUpdated) return -1;
	return new Date(bUpdated).getTime() - new Date(aUpdated).getTime();
}

function SubscriptionSummary({ email }: { email: string }) {
	const summary = subscriptionSummaryForCustomer(email);
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
	const { page, q } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	function handleSearchChange(value: string) {
		navigate({
			search: (prev) => ({ ...prev, q: value, page: 1 }),
			replace: true,
			resetScroll: false,
		});
	}

	function goToCustomer(customerId: string) {
		navigate({ to: "/customers/$customerId", params: { customerId } });
	}

	const filtered = allCustomers
		.filter((c) => {
			const query = q.trim().toLowerCase();
			if (!query) return true;
			return (
				c.name.toLowerCase().includes(query) ||
				c.email.toLowerCase().includes(query) ||
				c.phone.toLowerCase().includes(query)
			);
		})
		.sort(compareCustomers);

	const columns: ColumnDef<Customer>[] = [
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
			cell: ({ row }) => <SubscriptionSummary email={row.original.email} />,
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
						goToCustomer(row.original.id);
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

	const paginatedCustomers = table
		.getRowModel()
		.rows.map((row) => row.original);
	const pageCount = table.getPageCount();
	const hasAnyCustomers = allCustomers.length > 0;
	const isEmpty = filtered.length === 0;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Customers
			</h1>

			{hasAnyCustomers && (
				<div className="relative w-full sm:max-w-80">
					<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--ink-3)" />
					<Input
						placeholder="Search name, email, or phone…"
						value={q}
						onChange={(e) => handleSearchChange(e.target.value)}
						className="border-(--line) bg-(--surface) pl-9 focus-visible:ring-(--brand)/30"
					/>
				</div>
			)}

			{!hasAnyCustomers ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No customers yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Customers are created automatically when a subscriber completes
							checkout.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : isEmpty ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No customers match your search
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
						{paginatedCustomers.map((customer) => (
							<div
								key={customer.id}
								className="relative flex flex-col gap-2 rounded-2xl border border-(--line) bg-(--surface-1) p-4"
							>
								<button
									type="button"
									onClick={() => goToCustomer(customer.id)}
									aria-label={`View ${customer.name}`}
									className="absolute inset-0 z-0 rounded-2xl"
								/>
								<div className="relative z-10">
									<p className="m-0 font-medium text-(--ink)">
										{customer.name}
									</p>
									<p className="m-0 text-xs text-(--ink-3)">{customer.email}</p>
								</div>
								<div className="relative z-10 text-sm text-(--ink-2)">
									{customer.cardBrand} •••• {customer.cardLast4}
								</div>
								<div className="relative z-10">
									<SubscriptionSummary email={customer.email} />
								</div>
							</div>
						))}
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
