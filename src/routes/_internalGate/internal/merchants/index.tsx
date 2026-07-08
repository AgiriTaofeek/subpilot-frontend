import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { z } from "zod";

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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
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
	INTERNAL_MERCHANTS_PAGE_SIZE,
	internalMerchantsListQueryOptions,
	merchantStatusLabel,
	merchantStatusTone,
} from "#/data/internal-merchants.ts";
import { useDebouncedSearchInput } from "#/hooks/use-debounced-search-input.ts";
import { activatableRowProps } from "#/lib/activatable-row.ts";
import { formatDate } from "#/lib/date.ts";
import { pageSizeSchema } from "#/lib/pagination-sizes.ts";

const defaultMerchantsSearch = {
	q: "",
	status: "",
	page: 1,
	size: INTERNAL_MERCHANTS_PAGE_SIZE,
};

const merchantsSearchSchema = z.object({
	q: z.string().default(defaultMerchantsSearch.q),
	status: z.string().default(defaultMerchantsSearch.status),
	page: z.number().default(defaultMerchantsSearch.page),
	size: pageSizeSchema(defaultMerchantsSearch.size),
});

export const Route = createFileRoute("/_internalGate/internal/merchants/")({
	validateSearch: merchantsSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultMerchantsSearch)],
	},
	loaderDeps: ({ search }) => ({
		q: search.q,
		status: search.status,
		page: search.page,
		size: search.size,
	}),
	loader: ({ context, deps }) => {
		// Not awaited — see events.tsx for why.
		void context.queryClient.prefetchQuery(
			internalMerchantsListQueryOptions({
				query: deps.q || undefined,
				status: deps.status || undefined,
				page: deps.page,
				size: deps.size,
			}),
		);
	},
	component: InternalMerchantsPage,
	pendingComponent: () => <ListPageSkeleton columns={4} />,
	head: () => ({ meta: [{ title: "Merchants | SubPilot Internal" }] }),
});

function InternalMerchantsPage() {
	const { q, status, page, size } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: merchantsPage, isPlaceholderData } = useQuery(
		internalMerchantsListQueryOptions({
			query: q || undefined,
			status: status || undefined,
			page,
			size,
		}),
	);

	function handleStatusChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				status: value === "all" ? "" : value,
				page: 1,
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
			search: (prev) => ({ ...prev, q: value, page: 1 }),
			replace: true,
			resetScroll: false,
		});
	});

	function goToMerchant(merchantId: string) {
		navigate({
			to: "/internal/merchants/$merchantId",
			params: { merchantId },
		});
	}

	if (!merchantsPage) {
		return <ListPageSkeleton columns={4} />;
	}

	const merchants = merchantsPage.content;
	const hasActiveFilters = Boolean(q.trim() || status);
	const isEmpty = merchantsPage.totalElements === 0;
	const pageCount = Math.max(1, merchantsPage.totalPages);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Merchants
			</h1>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Select value={status || "all"} onValueChange={handleStatusChange}>
					<SelectTrigger className="w-52 rounded-md border-(--line) bg-(--surface) px-3">
						<SelectValue placeholder="All statuses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All statuses</SelectItem>
						<SelectItem value="active">Active</SelectItem>
						<SelectItem value="under_review">Under review</SelectItem>
						<SelectItem value="suspended">Suspended</SelectItem>
					</SelectContent>
				</Select>

				<Input
					placeholder="Search business, email, or slug…"
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					className="w-full border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30 sm:max-w-64"
				/>
			</div>

			{isEmpty ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							{hasActiveFilters
								? "No merchants match your filters"
								: "No merchants yet"}
						</EmptyTitle>
						{hasActiveFilters && (
							<EmptyDescription className="text-(--ink-3)">
								Try a different status or search term.
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
								<TableRow className="border-(--line) hover:bg-transparent">
									<TableHead className="text-(--ink-3)">Business</TableHead>
									<TableHead className="text-(--ink-3)">Status</TableHead>
									<TableHead className="text-(--ink-3)">Fees</TableHead>
									<TableHead className="text-(--ink-3)">Created</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{merchants.map((merchant) => (
									<TableRow
										key={merchant.merchantId}
										className="border-(--line) hover:bg-(--surface-2)"
									>
										<TableCell>
											<Link
												to="/internal/merchants/$merchantId"
												params={{ merchantId: merchant.merchantId }}
												className="text-(--brand) hover:underline"
											>
												<div className="flex flex-col">
													<span className="font-medium text-(--ink)">
														{merchant.businessName}
													</span>
													<span className="text-xs text-(--ink-3)">
														{merchant.email}
													</span>
												</div>
											</Link>
										</TableCell>
										<TableCell>
											<StatusBadge tone={merchantStatusTone[merchant.status]}>
												{merchantStatusLabel[merchant.status]}
											</StatusBadge>
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{merchant.feeSource === "override"
												? "Override"
												: "Default"}
										</TableCell>
										<TableCell className="text-(--ink-3)">
											{formatDate(merchant.createdAt)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Mobile cards */}
					<div className="flex flex-col gap-3 md:hidden">
						{merchants.map((merchant) => (
							<div
								key={merchant.merchantId}
								{...activatableRowProps(() =>
									goToMerchant(merchant.merchantId),
								)}
								className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-(--line) bg-(--surface-1) p-4"
							>
								<div className="flex items-start justify-between gap-2">
									<div>
										<p className="m-0 font-medium text-(--ink)">
											{merchant.businessName}
										</p>
										<p className="m-0 text-xs text-(--ink-3)">
											{merchant.email}
										</p>
									</div>
									<StatusBadge tone={merchantStatusTone[merchant.status]}>
										{merchantStatusLabel[merchant.status]}
									</StatusBadge>
								</div>
								<div className="text-sm text-(--ink-2)">
									{merchant.feeSource === "override" ? "Override" : "Default"}{" "}
									fees · {formatDate(merchant.createdAt)}
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
