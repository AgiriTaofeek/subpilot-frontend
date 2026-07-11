import {
	FunnelIcon,
	MagnifyingGlassIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
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
import { useCallback, useMemo } from "react";
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
	EmptyContent,
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
	pastDueSubscriptionsCountQueryOptions,
	SUBSCRIPTIONS_PAGE_SIZE,
	type SubscriptionStatus,
	type SubscriptionSummary,
	subscriptionStatusLabel,
	subscriptionStatusTone,
	subscriptionsListPageQueryOptions,
} from "#/data/subscriptions.ts";
import { useDebouncedSearchInput } from "#/hooks/use-debounced-search-input.ts";
import { activatableRowProps } from "#/lib/activatable-row.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatDate } from "#/lib/date.ts";
import { pageSizeSchema } from "#/lib/pagination-sizes.ts";

const statusValues = [
	"trialing",
	"active",
	"past_due",
	"suspended",
	"paused",
	"cancelled",
	"expired",
] as const;

const defaultSubsSearch = { page: 1, q: "", size: SUBSCRIPTIONS_PAGE_SIZE };

const subscriptionsSearchSchema = z.object({
	page: z.number().default(defaultSubsSearch.page),
	status: z.enum(statusValues).optional().catch(undefined),
	planId: z.string().optional().catch(undefined),
	q: z.string().default(defaultSubsSearch.q),
	size: pageSizeSchema(defaultSubsSearch.size),
});

export const Route = createFileRoute("/_dashboard/subscriptions/")({
	validateSearch: subscriptionsSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultSubsSearch)],
	},
	loaderDeps: ({ search }) => ({
		page: search.page,
		status: search.status,
		planId: search.planId,
		q: search.q,
		size: search.size,
	}),
	loader: async ({ context, deps }) => {
		// Subscriptions: not awaited — see events.tsx for why. Plans/past-due
		// count: still awaited, small reference/aggregate data, not the
		// paginated resource.
		void context.queryClient.prefetchQuery(
			subscriptionsListPageQueryOptions(deps),
		);
		await Promise.all([
			context.queryClient.ensureQueryData(plansQueryOptions()),
			context.queryClient.ensureQueryData(
				pastDueSubscriptionsCountQueryOptions(),
			),
		]);
	},
	component: SubscriptionsListPage,
	pendingComponent: () => <ListPageSkeleton columns={5} />,
	head: () => ({ meta: [{ title: "Subscriptions | SubPilot" }] }),
});

const statusFilters: Array<{ value: SubscriptionStatus; label: string }> =
	statusValues.map((value) => ({
		value,
		label: subscriptionStatusLabel[value],
	}));

function SubscriptionsListPage() {
	const { page, status, planId, q, size } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const queryClient = useQueryClient();
	const goToSubscription = useCallback(
		(subscriptionId: string) => {
			navigate({
				to: "/subscriptions/$subscriptionId",
				params: { subscriptionId },
			});
		},
		[navigate],
	);
	const { data: subscriptionsPage, isPlaceholderData } = useQuery(
		subscriptionsListPageQueryOptions({ page, status, planId, q, size }),
	);
	const { data: plans } = useSuspenseQuery(plansQueryOptions());

	function refreshSubscriptions() {
		queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
	}

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
				size: prev.size,
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
				size: prev.size,
			}),
			resetScroll: false,
		});
	}

	function handleSizeChange(nextSize: number) {
		navigate({
			search: (prev) => ({ ...prev, size: nextSize, page: 1 }),
			resetScroll: false,
		});
	}

	const [searchInput, setSearchInput] = useDebouncedSearchInput(q, (value) => {
		navigate({
			search: (prev) => ({
				page: 1,
				status: prev.status,
				planId: prev.planId,
				q: value,
				size: prev.size,
			}),
			replace: true,
			resetScroll: false,
		});
	});

	const { data: pastDueCount } = useSuspenseQuery(
		pastDueSubscriptionsCountQueryOptions(),
	);

	const subscriptions = subscriptionsPage?.content ?? [];

	const columns = useMemo<ColumnDef<SubscriptionSummary>[]>(
		() => [
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
					<div className="flex flex-col gap-1">
						<StatusBadge tone={subscriptionStatusTone[row.original.status]}>
							{subscriptionStatusLabel[row.original.status]}
						</StatusBadge>
						{row.original.cancelAtPeriodEnd && (
							<span className="text-xs text-(--warning)">
								Cancels{" "}
								{formatRelativeBillingDate(row.original.currentPeriodEnd)}
							</span>
						)}
					</div>
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
		],
		[],
	);

	const table = useReactTable({
		data: subscriptions,
		columns,
		getRowId: (row) => row.id,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount: Math.max(1, subscriptionsPage?.totalPages ?? 1),
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

	if (!subscriptionsPage) {
		return <ListPageSkeleton columns={5} />;
	}

	const pageCount = table.getPageCount();
	const hasActiveFilters = Boolean(status || planId || q.trim());
	const isEmpty = subscriptionsPage.totalElements === 0;

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
						<SelectTrigger className="w-48 border-(--line) bg-(--surface) px-3">
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
							<Select
								value={planId ?? "all"}
								onValueChange={handlePlanFilterChange}
							>
								<SelectTrigger className="w-full border-(--line) bg-(--surface) px-3">
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
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									className="border-(--line) bg-(--surface) pl-9 pr-3 focus-visible:ring-(--brand)/30"
								/>
							</div>
						</div>
					</SheetContent>
				</Sheet>
			</div>

			{isEmpty && !hasActiveFilters ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No subscriptions yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Subscriptions appear here after a customer completes checkout. If
							you just shared a checkout link, a new subscription may still be
							processing — refresh in a few seconds.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button
							variant="outline"
							onClick={refreshSubscriptions}
							className="border-(--line)"
						>
							Refresh
						</Button>
					</EmptyContent>
				</Empty>
			) : isEmpty && hasActiveFilters ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No subscriptions match your filters
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
								{table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										onClick={() => goToSubscription(row.original.id)}
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
						{subscriptions.map((sub) => {
							const isPastDue = sub.status === "past_due";
							return (
								<div
									key={sub.id}
									{...activatableRowProps(() => goToSubscription(sub.id))}
									className={`flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 ${
										isPastDue
											? "border-amber-500/20 bg-amber-500/5"
											: "border-(--line) bg-(--surface-1)"
									}`}
								>
									<div className="flex items-start justify-between gap-2">
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
									<div className="text-sm text-(--ink-2)">
										{sub.planName} · {formatNGN(sub.amountKobo)}
									</div>
									<div className="text-xs text-(--ink-3)">
										Next billing:{" "}
										{formatRelativeBillingDate(sub.nextBillingDate)}
									</div>
									{isPastDue && sub.nextRetryAt && (
										<div className="text-xs font-medium text-(--warning)">
											Next retry: {formatRelativeBillingDate(sub.nextRetryAt)}
										</div>
									)}
									{sub.cancelAtPeriodEnd && (
										<div className="text-xs font-medium text-(--warning)">
											Cancels: {formatRelativeBillingDate(sub.currentPeriodEnd)}
										</div>
									)}
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
