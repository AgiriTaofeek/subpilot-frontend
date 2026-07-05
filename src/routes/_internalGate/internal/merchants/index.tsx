import { useSuspenseQuery } from "@tanstack/react-query";
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
	internalMerchantsListQueryOptions,
	merchantStatusLabel,
	merchantStatusTone,
} from "#/data/internal-merchants.ts";
import { formatDate } from "#/lib/date.ts";

const defaultMerchantsSearch = { q: "", status: "", page: 1 };

const merchantsSearchSchema = z.object({
	q: z.string().default(defaultMerchantsSearch.q),
	status: z.string().default(defaultMerchantsSearch.status),
	page: z.number().default(defaultMerchantsSearch.page),
});

export const Route = createFileRoute("/_internalGate/internal/merchants/")({
	validateSearch: merchantsSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultMerchantsSearch)],
	},
	loaderDeps: ({ search }) => ({ status: search.status }),
	loader: async ({ context, deps }) => {
		await context.queryClient.ensureQueryData(
			internalMerchantsListQueryOptions({
				status: deps.status || undefined,
			}),
		);
	},
	component: InternalMerchantsPage,
	pendingComponent: () => <ListPageSkeleton columns={4} />,
	head: () => ({ meta: [{ title: "Merchants | SubPilot Internal" }] }),
});

const PAGE_SIZE = 20;

function InternalMerchantsPage() {
	const { q, status, page } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: merchants } = useSuspenseQuery(
		internalMerchantsListQueryOptions({ status: status || undefined }),
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

	function handleSearchChange(value: string) {
		navigate({
			search: (prev) => ({ ...prev, q: value, page: 1 }),
			replace: true,
			resetScroll: false,
		});
	}

	const filtered = merchants.filter((merchant) => {
		const query = q.trim().toLowerCase();
		if (!query) return true;
		return (
			merchant.businessName.toLowerCase().includes(query) ||
			merchant.email.toLowerCase().includes(query) ||
			merchant.slug.toLowerCase().includes(query)
		);
	});

	const hasAnyMerchants = merchants.length > 0;
	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
					value={q}
					onChange={(e) => handleSearchChange(e.target.value)}
					className="w-full border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30 sm:max-w-64"
				/>
			</div>

			{!hasAnyMerchants ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No merchants match this filter
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Try a different status.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : filtered.length === 0 ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No merchants match your search
						</EmptyTitle>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					<div className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface-1)">
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
								{paginated.map((merchant) => (
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
