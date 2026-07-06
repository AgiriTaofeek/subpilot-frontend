import {
	CaretDownIcon,
	CaretUpDownIcon,
	CaretUpIcon,
	CopyIcon,
	DotsThreeIcon,
	MagnifyingGlassIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	getRouteApi,
	Link,
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
import { toast } from "sonner";
import { z } from "zod";

import { RestrictedAction } from "#/components/layout/restricted-action.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
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
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group.tsx";
import {
	archivePlan,
	checkoutUrl,
	formatInterval,
	PLANS_PAGE_SIZE,
	type Plan,
	type PlanStatus,
	planDetailQueryOptions,
	plansListQueryOptions,
	publishPlan,
	statusTone,
} from "#/data/plans.ts";
import { useDebouncedSearchInput } from "#/hooks/use-debounced-search-input.ts";
import { useHandleMutationError } from "#/hooks/use-handle-mutation-error.ts";
import { activatableRowProps } from "#/lib/activatable-row.ts";
import { formatNGN } from "#/lib/currency.ts";
import { pageSizeSchema } from "#/lib/pagination-sizes.ts";

const dashboardRouteApi = getRouteApi("/_dashboard");

const sortKeys = ["name", "amountKobo", "trialDays", "status"] as const;
type SortKey = (typeof sortKeys)[number];

const defaultPlansSearch = {
	page: 1,
	q: "",
	order: "asc" as const,
	size: PLANS_PAGE_SIZE,
};

const plansSearchSchema = z.object({
	page: z.number().default(defaultPlansSearch.page),
	status: z
		.enum(["draft", "published", "archived"])
		.optional()
		.catch(undefined),
	q: z.string().default(defaultPlansSearch.q),
	sort: z.enum(sortKeys).optional().catch(undefined),
	order: z.enum(["asc", "desc"]).default(defaultPlansSearch.order),
	size: pageSizeSchema(defaultPlansSearch.size),
});

export const Route = createFileRoute("/_dashboard/plans/")({
	validateSearch: plansSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultPlansSearch)],
	},
	loaderDeps: ({ search }) => ({
		page: search.page,
		status: search.status,
		q: search.q,
		sort: search.sort,
		order: search.order,
		size: search.size,
	}),
	loader: ({ context, deps }) => {
		// Not awaited — see events.tsx for why.
		void context.queryClient.prefetchQuery(plansListQueryOptions(deps));
	},
	component: PlansListPage,
	pendingComponent: () => <ListPageSkeleton columns={7} />,
	head: () => ({ meta: [{ title: "Plans | SubPilot" }] }),
});

const statusFilters: Array<{ value: PlanStatus; label: string }> = [
	{ value: "draft", label: "Draft" },
	{ value: "published", label: "Published" },
	{ value: "archived", label: "Archived" },
];

function PlansListPage() {
	const { merchantSession } = dashboardRouteApi.useRouteContext();
	const { page, status, q, sort, order, size } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const queryClient = useQueryClient();
	const { data: plansPage, isPlaceholderData } = useQuery(
		plansListQueryOptions({ page, status, q, sort, order, size }),
	);
	const handleMutationError = useHandleMutationError();

	function handleSizeChange(nextSize: number) {
		navigate({
			search: (prev) => ({ ...prev, size: nextSize, page: 1 }),
			resetScroll: false,
		});
	}

	const publishMutation = useMutation({
		mutationFn: (planId: string) => publishPlan(planId),
		onSuccess: async (updatedPlan) => {
			await queryClient.invalidateQueries({ queryKey: ["plans"] });
			queryClient.setQueryData(
				planDetailQueryOptions(updatedPlan.id).queryKey,
				updatedPlan,
			);
			toast.success("Plan published");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't publish the plan.",
			}),
	});

	const archiveMutation = useMutation({
		mutationFn: (planId: string) => archivePlan(planId),
		onSuccess: async (updatedPlan) => {
			await queryClient.invalidateQueries({ queryKey: ["plans"] });
			queryClient.setQueryData(
				planDetailQueryOptions(updatedPlan.id).queryKey,
				updatedPlan,
			);
			toast.success("Plan archived");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't archive the plan.",
			}),
	});

	function handleStatusFilterChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				status: (value || undefined) as PlanStatus | undefined,
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

	const handleSortToggle = useCallback(
		(key: SortKey) => {
			navigate({
				search: (prev) => ({
					...prev,
					sort: key,
					order: prev.sort === key && prev.order === "asc" ? "desc" : "asc",
					page: 1,
				}),
				resetScroll: false,
			});
		},
		[navigate],
	);

	const handleCopy = useCallback(async (plan: Plan) => {
		const url = `${window.location.origin}${checkoutUrl(plan)}`;
		try {
			await navigator.clipboard.writeText(url);
			toast.success("Checkout link copied", { duration: 2000 });
		} catch {
			toast.error("Couldn't copy to clipboard.");
		}
	}, []);

	const goToPlan = useCallback(
		(planId: string) => {
			navigate({ to: "/plans/$planId", params: { planId } });
		},
		[navigate],
	);

	const { mutate: publishPlanMutate, isPending: isPublishPending } =
		publishMutation;
	const { mutate: archivePlanMutate, isPending: isArchivePending } =
		archiveMutation;

	const columns = useMemo<ColumnDef<Plan>[]>(() => {
		function sortableHeader(label: string, key: SortKey) {
			const isActive = sort === key;
			return (
				<button
					type="button"
					onClick={() => handleSortToggle(key)}
					className="flex items-center gap-1 text-(--ink-3) hover:text-(--ink)"
				>
					{label}
					{isActive ? (
						order === "asc" ? (
							<CaretUpIcon className="size-3" />
						) : (
							<CaretDownIcon className="size-3" />
						)
					) : (
						<CaretUpDownIcon className="size-3 opacity-40" />
					)}
				</button>
			);
		}

		return [
			{
				accessorKey: "name",
				header: () => sortableHeader("Name", "name"),
				cell: ({ row }) => (
					<span className="font-medium text-(--ink)">{row.original.name}</span>
				),
			},
			{
				accessorKey: "amountKobo",
				header: () => sortableHeader("Price", "amountKobo"),
				cell: ({ row }) => (
					<span className="text-(--ink-2)">
						{formatNGN(row.original.amountKobo)}
					</span>
				),
			},
			{
				id: "interval",
				header: "Interval",
				cell: ({ row }) => (
					<span className="text-(--ink-2)">
						{formatInterval(row.original.interval)}
					</span>
				),
			},
			{
				accessorKey: "trialDays",
				header: () => sortableHeader("Trial", "trialDays"),
				cell: ({ row }) => (
					<span className="text-(--ink-2)">
						{row.original.trialDays > 0 ? `${row.original.trialDays}d` : "—"}
					</span>
				),
			},
			{
				accessorKey: "status",
				header: () => sortableHeader("Status", "status"),
				cell: ({ row }) => (
					<StatusBadge tone={statusTone[row.original.status]}>
						{row.original.status}
					</StatusBadge>
				),
			},
			{
				id: "hostedUrl",
				header: "Hosted URL",
				cell: ({ row }) => {
					const plan = row.original;
					if (plan.status !== "published")
						return <span className="text-(--ink-3)">—</span>;
					return (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleCopy(plan);
							}}
							className="flex items-center gap-1.5 rounded-full border border-(--line) bg-(--surface-2) px-2.5 py-1 text-xs text-(--ink-2) hover:bg-(--surface-3)"
						>
							<CopyIcon className="size-3.5" />
							Copy link
						</button>
					);
				},
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => {
					const plan = row.original;
					return (
						<DropdownMenu>
							<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="Plan actions"
									className="text-(--ink-3) hover:text-(--ink)"
								>
									<DotsThreeIcon className="size-5" weight="bold" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => goToPlan(plan.id)}>
									View
								</DropdownMenuItem>
								{plan.status === "draft" && (
									<DropdownMenuItem
										disabled={
											isPublishPending || merchantSession.status !== "active"
										}
										onClick={() => publishPlanMutate(plan.id)}
									>
										Publish
									</DropdownMenuItem>
								)}
								{plan.status !== "archived" && (
									<DropdownMenuItem
										variant="destructive"
										disabled={isArchivePending}
										onClick={() => archivePlanMutate(plan.id)}
									>
										Archive
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
			},
		];
	}, [
		sort,
		order,
		handleSortToggle,
		handleCopy,
		goToPlan,
		isPublishPending,
		publishPlanMutate,
		isArchivePending,
		archivePlanMutate,
		merchantSession.status,
	]);

	const plans = plansPage?.content ?? [];

	const table = useReactTable({
		data: plans,
		columns,
		getRowId: (row) => row.id,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount: Math.max(1, plansPage?.totalPages ?? 1),
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

	if (!plansPage) {
		return <ListPageSkeleton columns={7} />;
	}

	const pageCount = table.getPageCount();

	const hasActiveFilters = Boolean(status || q.trim());
	const isArchivedEmptyFilter =
		status === "archived" && plansPage.totalElements === 0;
	const isEmpty = plansPage.totalElements === 0;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
					Plans
				</h1>
				<RestrictedAction
					status={merchantSession.status}
					triggerClassName="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
					triggerChildren={
						<>
							<PlusIcon data-icon="inline-start" />
							Create plan
						</>
					}
				>
					<Button
						asChild
						className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
					>
						<Link to="/plans/new">
							<PlusIcon data-icon="inline-start" />
							Create plan
						</Link>
					</Button>
				</RestrictedAction>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

				<div className="relative w-full sm:max-w-64">
					<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--ink-3)" />
					<Input
						placeholder="Search plans…"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="border-(--line) bg-(--surface) pl-9 pr-3 focus-visible:ring-(--brand)/30"
					/>
				</div>
			</div>

			{isEmpty && !hasActiveFilters ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyMedia
							variant="icon"
							className="rounded-full bg-(--brand)/10 text-(--brand)"
						>
							<PlusIcon />
						</EmptyMedia>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No plans yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Create a plan to generate a checkout link you can share with
							customers.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<RestrictedAction
							status={merchantSession.status}
							triggerClassName="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
							triggerChildren="Create plan"
						>
							<Button
								asChild
								className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
							>
								<Link to="/plans/new">Create plan</Link>
							</Button>
						</RestrictedAction>
					</EmptyContent>
				</Empty>
			) : isArchivedEmptyFilter ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No archived plans
						</EmptyTitle>
					</EmptyHeader>
				</Empty>
			) : isEmpty ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No plans match your search
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
										onClick={() => goToPlan(row.original.id)}
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
						{plans.map((plan) => (
							<div
								key={plan.id}
								{...activatableRowProps(() => goToPlan(plan.id))}
								className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-(--line) bg-(--surface-1) p-4"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium text-(--ink)">{plan.name}</span>
									<StatusBadge tone={statusTone[plan.status]}>
										{plan.status}
									</StatusBadge>
								</div>
								<div className="text-sm text-(--ink-2)">
									{formatNGN(plan.amountKobo)} · {formatInterval(plan.interval)}
								</div>
								{plan.status === "published" && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											handleCopy(plan);
										}}
										className="flex w-fit items-center gap-1.5 rounded-full border border-(--line) bg-(--surface-2) px-2.5 py-1 text-xs text-(--ink-2)"
									>
										<CopyIcon className="size-3.5" />
										Copy link
									</button>
								)}
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
