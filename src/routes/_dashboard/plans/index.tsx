import {
	CaretDownIcon,
	CaretUpDownIcon,
	CaretUpIcon,
	CopyIcon,
	DotsThreeIcon,
	MagnifyingGlassIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import {
	createFileRoute,
	Link,
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
import { toast } from "sonner";
import { z } from "zod";

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
	plans as allPlans,
	checkoutUrl,
	formatInterval,
	type Plan,
	type PlanStatus,
	statusTone,
} from "#/data/plans.ts";
import { formatNGN } from "#/lib/currency.ts";

const sortKeys = ["name", "amountKobo", "trialDays", "status"] as const;
type SortKey = (typeof sortKeys)[number];

const defaultPlansSearch = {
	page: 1,
	q: "",
	order: "asc" as const,
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
});

export const Route = createFileRoute("/_dashboard/plans/")({
	validateSearch: plansSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultPlansSearch)],
	},
	component: PlansListPage,
	head: () => ({ meta: [{ title: "Plans | SubPilot" }] }),
});

const PAGE_SIZE = 10;

const statusFilters: Array<{ value: PlanStatus; label: string }> = [
	{ value: "draft", label: "Draft" },
	{ value: "published", label: "Published" },
	{ value: "archived", label: "Archived" },
];

function comparePlans(
	a: Plan,
	b: Plan,
	sort: SortKey | undefined,
	order: "asc" | "desc",
) {
	if (!sort) {
		// Default: published plans float above drafts/archived, then created_at desc.
		const rank = (p: Plan) => (p.status === "published" ? 0 : 1);
		const rankDiff = rank(a) - rank(b);
		if (rankDiff !== 0) return rankDiff;
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	}
	const dir = order === "asc" ? 1 : -1;
	switch (sort) {
		case "name":
			return a.name.localeCompare(b.name) * dir;
		case "amountKobo":
			return (a.amountKobo - b.amountKobo) * dir;
		case "trialDays":
			return (a.trialDays - b.trialDays) * dir;
		case "status":
			return a.status.localeCompare(b.status) * dir;
	}
}

function sortPlans(
	plans: Plan[],
	sort: SortKey | undefined,
	order: "asc" | "desc",
) {
	return [...plans].sort((a, b) => comparePlans(a, b, sort, order));
}

function PlansListPage() {
	const { page, status, q, sort, order } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

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

	function handleSearchChange(value: string) {
		navigate({
			search: (prev) => ({ ...prev, q: value, page: 1 }),
			replace: true,
			resetScroll: false,
		});
	}

	function handleSortToggle(key: SortKey) {
		navigate({
			search: (prev) => ({
				...prev,
				sort: key,
				order: prev.sort === key && prev.order === "asc" ? "desc" : "asc",
				page: 1,
			}),
			resetScroll: false,
		});
	}

	async function handleCopy(plan: Plan) {
		const url = `${window.location.origin}${checkoutUrl(plan)}`;
		await navigator.clipboard.writeText(url);
		toast.success("Checkout link copied", { duration: 2000 });
	}

	function goToPlan(planId: string) {
		navigate({ to: "/plans/$planId", params: { planId } });
	}

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

	const columns: ColumnDef<Plan>[] = [
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
								<DropdownMenuItem>Publish</DropdownMenuItem>
							)}
							{plan.status !== "archived" && (
								<DropdownMenuItem variant="destructive">
									Archive
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const filtered = sortPlans(
		allPlans
			.filter((p) => !status || p.status === status)
			.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())),
		sort,
		order,
	);

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

	const paginatedPlans = table.getRowModel().rows.map((row) => row.original);
	const pageCount = table.getPageCount();

	const hasAnyPlans = allPlans.length > 0;
	const isArchivedEmptyFilter = status === "archived" && filtered.length === 0;
	const isEmpty = filtered.length === 0;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
					Plans
				</h1>
				<Button
					asChild
					className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
				>
					<Link to="/plans/new">
						<PlusIcon data-icon="inline-start" />
						Create plan
					</Link>
				</Button>
			</div>

			{hasAnyPlans && (
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
							value={q}
							onChange={(e) => handleSearchChange(e.target.value)}
							className="border-(--line) bg-(--surface) pl-9 focus-visible:ring-(--brand)/30"
						/>
					</div>
				</div>
			)}

			{!hasAnyPlans ? (
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
						<Button
							asChild
							className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							<Link to="/plans/new">Create plan</Link>
						</Button>
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
						{paginatedPlans.map((plan) => (
							<div
								key={plan.id}
								className="relative flex flex-col gap-2 rounded-2xl border border-(--line) bg-(--surface-1) p-4"
							>
								<button
									type="button"
									onClick={() => goToPlan(plan.id)}
									aria-label={`View ${plan.name}`}
									className="absolute inset-0 z-0 rounded-2xl"
								/>
								<div className="relative z-10 flex items-center justify-between gap-2">
									<span className="font-medium text-(--ink)">{plan.name}</span>
									<StatusBadge tone={statusTone[plan.status]}>
										{plan.status}
									</StatusBadge>
								</div>
								<div className="relative z-10 text-sm text-(--ink-2)">
									{formatNGN(plan.amountKobo)} · {formatInterval(plan.interval)}
								</div>
								{plan.status === "published" && (
									<button
										type="button"
										onClick={() => handleCopy(plan)}
										className="relative z-10 flex w-fit items-center gap-1.5 rounded-full border border-(--line) bg-(--surface-2) px-2.5 py-1 text-xs text-(--ink-2)"
									>
										<CopyIcon className="size-3.5" />
										Copy link
									</button>
								)}
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
