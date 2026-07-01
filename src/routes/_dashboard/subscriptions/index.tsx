import {
	FunnelIcon,
	MagnifyingGlassIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
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

import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "#/components/ui/alert.tsx";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
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
import { plansQueryOptions } from "#/data/plans.ts";
import {
	formatRelativeBillingDate,
	type SubscriptionStatus,
	type SubscriptionSummary,
	subscriptionStatusLabel,
	subscriptionStatusTone,
	subscriptionsListQueryOptions,
} from "#/data/subscriptions.ts";
import { formatNGN } from "#/lib/currency.ts";

const statusValues = [
	"trialing",
	"active",
	"past_due",
	"suspended",
	"paused",
	"cancelled",
	"expired",
] as const;

const defaultSubsSearch = { page: 1, q: "" };

const subscriptionsSearchSchema = z.object({
	page: z.number().default(defaultSubsSearch.page),
	status: z.enum(statusValues).optional().catch(undefined),
	planId: z.string().optional().catch(undefined),
	q: z.string().default(defaultSubsSearch.q),
});

export const Route = createFileRoute("/_dashboard/subscriptions/")({
	validateSearch: subscriptionsSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultSubsSearch)],
	},
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(subscriptionsListQueryOptions()),
			context.queryClient.ensureQueryData(plansQueryOptions()),
		]);
	},
	component: SubscriptionsListPage,
	head: () => ({ meta: [{ title: "Subscriptions | SubPilot" }] }),
});

const PAGE_SIZE = 10;

const statusFilters: Array<{ value: SubscriptionStatus; label: string }> =
	statusValues.map((value) => ({
		value,
		label: subscriptionStatusLabel[value],
	}));

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function statusRank(status: SubscriptionStatus): number {
	if (status === "past_due") return 0;
	if (status === "active") return 1;
	return 2;
}

function compareSubscriptions(
	a: SubscriptionSummary,
	b: SubscriptionSummary,
): number {
	const rankDiff = statusRank(a.status) - statusRank(b.status);
	if (rankDiff !== 0) return rankDiff;
	if (a.status === "active" && b.status === "active") {
		const aTime = a.nextBillingDate
			? new Date(a.nextBillingDate).getTime()
			: Infinity;
		const bTime = b.nextBillingDate
			? new Date(b.nextBillingDate).getTime()
			: Infinity;
		return aTime - bTime;
	}
	return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function SubscriptionsListPage() {
	const { page, status, planId, q } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: allSubscriptions } = useSuspenseQuery(
		subscriptionsListQueryOptions(),
	);
	const { data: plans } = useSuspenseQuery(plansQueryOptions());

	function handleStatusFilterChange(value: string) {
		const nextStatus: (typeof statusValues)[number] | undefined = value
			? (value as (typeof statusValues)[number])
			: undefined;

		navigate({
			search: (prev) => ({
				page: 1,
				status: nextStatus,
				planId: prev.planId,
				q: prev.q,
			}),
			resetScroll: false,
		});
	}

	function handlePlanFilterChange(value: string) {
		navigate({
			search: (prev) => ({
				page: 1,
				status: prev.status,
				planId: value === "all" ? undefined : value,
				q: prev.q,
			}),
			resetScroll: false,
		});
	}

	function handleSearchChange(value: string) {
		navigate({
			search: (prev) => ({
				page: 1,
				status: prev.status,
				planId: prev.planId,
				q: value,
			}),
			replace: true,
			resetScroll: false,
		});
	}

	const pastDueCount = allSubscriptions.filter(
		(s) => s.status === "past_due",
	).length;

	const filtered = allSubscriptions
		.filter((s) => !status || s.status === status)
		.filter((s) => !planId || s.planId === planId)
		.filter((s) => {
			const query = q.trim().toLowerCase();
			if (!query) return true;
			return (
				s.customerName.toLowerCase().includes(query) ||
				s.customerEmail.toLowerCase().includes(query)
			);
		})
		.sort(compareSubscriptions);

	const columns: ColumnDef<SubscriptionSummary>[] = [
		{
			id: "customer",
			header: "Customer",
			cell: ({ row }) => (
				<div>
					<p className="m-0 font-medium text-(--ink)">
						{row.original.customerName}
					</p>
					<p className="m-0 text-xs text-(--ink-3)">
						{row.original.customerEmail}
					</p>
				</div>
			),
		},
		{
			id: "plan",
			header: "Plan",
			cell: ({ row }) => (
				<span className="text-(--ink-2)">{row.original.planName}</span>
			),
		},
		{
			id: "status",
			header: "Status",
			cell: ({ row }) => (
				<StatusBadge tone={subscriptionStatusTone[row.original.status]}>
					{subscriptionStatusLabel[row.original.status]}
				</StatusBadge>
			),
		},
		{
			id: "nextBillingDate",
			header: "Next billing",
			cell: ({ row }) => (
				<span className="text-(--ink-2)">
					{formatRelativeBillingDate(row.original.nextBillingDate)}
				</span>
			),
		},
		{
			id: "currentPeriodEnd",
			header: "Period end",
			cell: ({ row }) => (
				<span className="text-(--ink-2)">
					{formatDate(row.original.currentPeriodEnd)}
				</span>
			),
		},
		{
			id: "amount",
			header: "Amount",
			cell: ({ row }) => (
				<span className="text-(--ink-2)">
					{formatNGN(row.original.amountKobo)}
				</span>
			),
		},
		{
			id: "updatedAt",
			header: "Updated",
			cell: ({ row }) => (
				<span className="text-(--ink-3)">
					{formatDate(row.original.updatedAt)}
				</span>
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

	const paginatedSubscriptions = table
		.getRowModel()
		.rows.map((row) => row.original);
	const pageCount = table.getPageCount();
	const hasAnySubscriptions = allSubscriptions.length > 0;
	const isEmpty = filtered.length === 0;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Subscriptions
			</h1>

			{pastDueCount > 0 && (
				<Alert className="border-amber-500/20 bg-amber-500/5">
					<WarningCircleIcon className="text-(--warning)" />
					<AlertTitle className="text-(--ink)">
						{pastDueCount} subscription{pastDueCount === 1 ? "" : "s"} past due
					</AlertTitle>
					<AlertDescription className="text-(--ink-3)">
						Being retried automatically.
					</AlertDescription>
					<AlertAction>
						<Button
							size="sm"
							variant="outline"
							onClick={() => handleStatusFilterChange("past_due")}
							className="border-amber-500/30 text-(--warning)"
						>
							View
						</Button>
					</AlertAction>
				</Alert>
			)}

			{hasAnySubscriptions && (
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

					{/* Desktop: plan select + search inline */}
					<div className="hidden items-center gap-3 sm:flex">
						<Select
							value={planId ?? "all"}
							onValueChange={handlePlanFilterChange}
						>
							<SelectTrigger className="w-48 rounded-md border-(--line) bg-(--surface) px-3">
								<SelectValue placeholder="All plans" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All plans</SelectItem>
								{plans.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<div className="relative w-full max-w-64">
							<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--ink-3)" />
							<Input
								placeholder="Search customer…"
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
								<Select
									value={planId ?? "all"}
									onValueChange={handlePlanFilterChange}
								>
									<SelectTrigger className="w-full rounded-md border-(--line) bg-(--surface) px-3">
										<SelectValue placeholder="All plans" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All plans</SelectItem>
										{plans.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								<div className="relative w-full">
									<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--ink-3)" />
									<Input
										placeholder="Search customer…"
										value={q}
										onChange={(e) => handleSearchChange(e.target.value)}
										className="border-(--line) bg-(--surface) pl-9 focus-visible:ring-(--brand)/30"
									/>
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			)}

			{!hasAnySubscriptions ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No subscriptions yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Subscriptions appear here after a customer completes checkout.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : isEmpty ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No subscriptions match your filters
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
									<TableRow key={row.id} className="border-(--line)">
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
						{paginatedSubscriptions.map((sub) => {
							const isPastDue = sub.status === "past_due";
							return (
								<div
									key={sub.id}
									className={`relative flex flex-col gap-2 rounded-2xl border p-4 ${
										isPastDue
											? "border-amber-500/20 bg-amber-500/5"
											: "border-(--line) bg-(--surface-1)"
									}`}
								>
									<div className="relative z-10 flex items-start justify-between gap-2">
										<div>
											<p className="m-0 font-medium text-(--ink)">
												{sub.customerName}
											</p>
											<p className="m-0 text-xs text-(--ink-3)">
												{sub.customerEmail}
											</p>
										</div>
										<StatusBadge tone={subscriptionStatusTone[sub.status]}>
											{subscriptionStatusLabel[sub.status]}
										</StatusBadge>
									</div>
									<div className="relative z-10 text-sm text-(--ink-2)">
										{sub.planName} · {formatNGN(sub.amountKobo)}
									</div>
									<div className="relative z-10 text-xs text-(--ink-3)">
										Next billing:{" "}
										{formatRelativeBillingDate(sub.nextBillingDate)}
									</div>
									{isPastDue && sub.nextRetryAt && (
										<div className="relative z-10 text-xs font-medium text-(--warning)">
											Next retry: {formatRelativeBillingDate(sub.nextRetryAt)}
										</div>
									)}
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
