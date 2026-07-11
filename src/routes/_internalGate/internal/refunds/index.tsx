import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import {
	createFileRoute,
	getRouteApi,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { QueryErrorPanel } from "#/components/layout/query-error-panel.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
import { Field, FieldLabel } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { PageSizeSelect } from "#/components/ui/page-size-select.tsx";
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
import { Spinner } from "#/components/ui/spinner.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import {
	INTERNAL_REFUNDS_HISTORY_PAGE_SIZE,
	internalRefundsHistoryQueryOptions,
	internalRefundsListQueryOptions,
} from "#/data/internal-refunds.ts";
import { refundStatusLabel, refundStatusTone } from "#/data/invoices.ts";
import { useHandleMutationError } from "#/hooks/use-handle-mutation-error.ts";
import {
	approveInternalRefund,
	rejectInternalRefund,
} from "#/lib/api/internal-refunds.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatDate } from "#/lib/date.ts";
import { pageSizeSchema } from "#/lib/pagination-sizes.ts";
import type { RefundSortFieldDto, RefundStatusDto } from "#/types/api.ts";

const internalGateRouteApi = getRouteApi("/_internalGate");

const sortFields = [
	"createdAt",
	"resolvedAt",
	"amount",
	"status",
	"merchantId",
] as const;

const sortFieldLabel: Record<RefundSortFieldDto, string> = {
	createdAt: "Created",
	resolvedAt: "Resolved",
	amount: "Amount",
	status: "Status",
	merchantId: "Merchant",
};

const defaultHistorySearch = {
	status: "all",
	merchantId: "",
	resolvedBy: "",
	sortBy: "createdAt" as RefundSortFieldDto,
	sortDir: "desc" as "asc" | "desc",
	page: 1,
	size: INTERNAL_REFUNDS_HISTORY_PAGE_SIZE,
};

const historySearchSchema = z.object({
	status: z.string().default(defaultHistorySearch.status),
	merchantId: z.string().default(defaultHistorySearch.merchantId),
	resolvedBy: z.string().default(defaultHistorySearch.resolvedBy),
	sortBy: z.enum(sortFields).default(defaultHistorySearch.sortBy),
	sortDir: z.enum(["asc", "desc"]).default(defaultHistorySearch.sortDir),
	page: z.number().default(defaultHistorySearch.page),
	size: pageSizeSchema(defaultHistorySearch.size),
});

export const Route = createFileRoute("/_internalGate/internal/refunds/")({
	validateSearch: historySearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultHistorySearch)],
	},
	loaderDeps: ({ search }) => search,
	loader: async ({ context, deps }) => {
		if (context.internalAdminSession.role === "super_admin") {
			await context.queryClient.ensureQueryData(
				internalRefundsListQueryOptions(),
			);
			// Not awaited — filter/sort changes on the history table below
			// shouldn't block navigation, they should just show the table's own
			// loading state (see events.tsx for the same pattern).
			void context.queryClient.prefetchQuery(
				internalRefundsHistoryQueryOptions({
					// "all" is sent through literally — RefundService.listWithFilters
					// treats that exact string as "no status filter". Omitting the
					// param instead would hit the endpoint's own default of
					// "pending_approval", silently narrowing "History" down to only
					// pending refunds instead of showing everything.
					status: deps.status,
					merchantId: deps.merchantId,
					resolvedBy: deps.resolvedBy,
					page: deps.page,
					size: deps.size,
					sortBy: deps.sortBy,
					sortDir: deps.sortDir,
				}),
			);
		}
	},
	component: InternalRefundsPage,
	head: () => ({ meta: [{ title: "Refunds | SubPilot Internal" }] }),
});

function InternalRefundsPage() {
	const { internalAdminSession } = internalGateRouteApi.useRouteContext();

	if (internalAdminSession.role !== "super_admin") {
		return (
			<div className="p-6">
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							Restricted to super admins
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Refund approval is limited to the super admin role.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-8 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Refunds
			</h1>
			<RefundsQueue adminId={internalAdminSession.adminId} />
			<RefundsHistory />
		</div>
	);
}

function RefundsQueue({ adminId }: { adminId: string }) {
	const queryClient = useQueryClient();
	const handleMutationError = useHandleMutationError();
	const { data: refunds } = useSuspenseQuery(internalRefundsListQueryOptions());
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [rejectReason, setRejectReason] = useState("");

	function invalidateRefunds() {
		return Promise.all([
			queryClient.invalidateQueries({
				queryKey: internalRefundsListQueryOptions().queryKey,
			}),
			queryClient.invalidateQueries({ queryKey: ["internal-refunds"] }),
			queryClient.invalidateQueries({
				queryKey: ["internal-dashboard-summary"],
			}),
		]);
	}

	const approveMutation = useMutation({
		mutationFn: (refundId: string) =>
			approveInternalRefund({ data: { refundId, adminIdentity: adminId } }),
		onSuccess: async () => {
			await invalidateRefunds();
			toast.success("Refund approved");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't approve this refund.",
			}),
	});

	const rejectMutation = useMutation({
		mutationFn: () =>
			rejectInternalRefund({
				data: {
					refundId: rejectingId as string,
					reason: rejectReason.trim() || undefined,
					adminIdentity: adminId,
				},
			}),
		onSuccess: async () => {
			await invalidateRefunds();
			setRejectingId(null);
			setRejectReason("");
			toast.success("Refund rejected");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't reject this refund.",
			}),
	});

	const pending = refunds.filter(
		(refund) =>
			refund.status === "pending_approval" || refund.status === "pending",
	);

	return (
		<div className="flex flex-col gap-3">
			<p className="island-kicker m-0">Pending approval</p>
			{pending.length === 0 ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No refunds waiting on approval
						</EmptyTitle>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="flex flex-col gap-3">
					{pending.map((refund) => (
						<Card
							key={refund.id}
							className="border border-(--line) bg-(--surface-1) shadow-none"
						>
							<CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<div className="flex items-center gap-2">
										<p className="m-0 font-medium text-(--ink)">
											{formatNGN(refund.amount)}
										</p>
										<StatusBadge tone={refundStatusTone(refund.status)}>
											{refundStatusLabel(refund.status)}
										</StatusBadge>
									</div>
									{refund.reason && (
										<p className="m-0 mt-0.5 text-xs text-(--ink-3)">
											{refund.reason}
										</p>
									)}
									<p className="m-0 mt-0.5 text-xs text-(--ink-3)">
										Invoice {refund.invoiceId} · {formatDate(refund.createdAt)}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setRejectingId(refund.id)}
										className="border-(--line)"
									>
										Reject
									</Button>
									<Button
										size="sm"
										onClick={() => approveMutation.mutate(refund.id)}
										disabled={approveMutation.isPending}
									>
										{approveMutation.isPending ? (
											<Spinner data-icon="inline-start" />
										) : (
											"Approve"
										)}
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<Dialog
				open={rejectingId !== null}
				onOpenChange={(open) => !open && setRejectingId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject this refund?</DialogTitle>
						<DialogDescription>
							The merchant's refund request will not be processed.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel htmlFor="reject-reason">Reason (optional)</FieldLabel>
						<Textarea
							id="reject-reason"
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							placeholder="Why is this being rejected?"
							className="border-(--line) bg-(--surface)"
						/>
					</Field>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRejectingId(null)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => rejectMutation.mutate()}
							disabled={rejectMutation.isPending}
						>
							{rejectMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Rejecting…
								</>
							) : (
								"Reject refund"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

const STATUS_OPTIONS: RefundStatusDto[] = [
	"pending_approval",
	"pending",
	"succeeded",
	"failed",
	"rejected",
];

function RefundsHistory() {
	const { status, merchantId, resolvedBy, sortBy, sortDir, page, size } =
		Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const { data, isPlaceholderData, isError, error, refetch } = useQuery(
		internalRefundsHistoryQueryOptions({
			// See the loader's identical comment — "all" must reach the backend
			// literally, not as an omitted/empty param.
			status,
			merchantId,
			resolvedBy,
			page,
			size,
			sortBy,
			sortDir,
		}),
	);

	function handleStatusChange(value: string) {
		navigate({
			search: (prev) => ({ ...prev, status: value, page: 1 }),
			resetScroll: false,
		});
	}

	function handleSortByChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				sortBy: value as RefundSortFieldDto,
			}),
			resetScroll: false,
		});
	}

	function toggleSortDir() {
		navigate({
			search: (prev) => ({
				...prev,
				sortDir: prev.sortDir === "desc" ? "asc" : "desc",
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

	// The query client's default retry is finite (see root-provider.tsx) and
	// this is a plain useQuery, not a suspense one — a failed request settles
	// into isError:true with data staying undefined forever, it never
	// throws. Checking only `!data` here would show the loading skeleton
	// permanently on any failure instead of ever surfacing it.
	if (isError) {
		return (
			<div className="flex flex-col gap-3">
				<p className="island-kicker m-0">History</p>
				<QueryErrorPanel error={error} onRetry={() => refetch()} />
			</div>
		);
	}

	if (!data) {
		return (
			<div className="flex flex-col gap-3">
				<p className="island-kicker m-0">History</p>
				<div className="h-40 animate-pulse rounded-md bg-(--surface-2)" />
			</div>
		);
	}

	const refunds = data.content;
	const pageCount = Math.max(1, data.totalPages);
	const hasActiveFilters = Boolean(
		merchantId.trim() || resolvedBy.trim() || status !== "all",
	);

	return (
		<Card className="border border-(--line) bg-(--surface-1) shadow-none">
			<CardHeader>
				<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
					History
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
					<Select value={status} onValueChange={handleStatusChange}>
						<SelectTrigger className="w-44 border-(--line) bg-(--surface) px-3">
							<SelectValue placeholder="All statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All statuses</SelectItem>
							{STATUS_OPTIONS.map((s) => (
								<SelectItem key={s} value={s}>
									{refundStatusLabel(s)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Input
						placeholder="Merchant ID"
						value={merchantId}
						onChange={(e) =>
							navigate({
								search: (prev) => ({
									...prev,
									merchantId: e.target.value,
									page: 1,
								}),
								replace: true,
								resetScroll: false,
							})
						}
						className="w-full border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30 sm:max-w-48"
					/>

					<Input
						placeholder="Resolved by (admin ID)"
						value={resolvedBy}
						onChange={(e) =>
							navigate({
								search: (prev) => ({
									...prev,
									resolvedBy: e.target.value,
									page: 1,
								}),
								replace: true,
								resetScroll: false,
							})
						}
						className="w-full border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30 sm:max-w-48"
					/>

					<div className="flex items-center gap-2">
						<Select value={sortBy} onValueChange={handleSortByChange}>
							<SelectTrigger className="w-40 border-(--line) bg-(--surface) px-3">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{sortFields.map((field) => (
									<SelectItem key={field} value={field}>
										{sortFieldLabel[field]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<button
							type="button"
							onClick={toggleSortDir}
							className="h-9 border border-(--line) bg-(--surface) px-3 text-sm text-(--ink-2) hover:bg-(--surface-2)"
						>
							{sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
						</button>
					</div>
				</div>

				<div
					className={
						isPlaceholderData
							? "flex flex-col gap-4 opacity-50 transition-opacity"
							: "flex flex-col gap-4"
					}
				>
					{refunds.length === 0 ? (
						<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
							<EmptyHeader>
								<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
									{hasActiveFilters
										? "No refunds match your filters"
										: "No refunds yet"}
								</EmptyTitle>
							</EmptyHeader>
						</Empty>
					) : (
						<>
							{/* Desktop table */}
							<div className="hidden overflow-hidden border border-(--line) md:block">
								<Table>
									<TableHeader>
										<TableRow className="border-(--line) hover:bg-transparent">
											<TableHead className="text-(--ink-3)">Amount</TableHead>
											<TableHead className="text-(--ink-3)">Status</TableHead>
											<TableHead className="text-(--ink-3)">Merchant</TableHead>
											<TableHead className="text-(--ink-3)">Invoice</TableHead>
											<TableHead className="text-(--ink-3)">
												Resolved by
											</TableHead>
											<TableHead className="text-(--ink-3)">Created</TableHead>
											<TableHead className="text-(--ink-3)">Resolved</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{refunds.map((refund) => (
											<TableRow key={refund.id} className="border-(--line)">
												<TableCell className="text-(--ink)">
													{formatNGN(refund.amount)}
												</TableCell>
												<TableCell>
													<StatusBadge tone={refundStatusTone(refund.status)}>
														{refundStatusLabel(refund.status)}
													</StatusBadge>
												</TableCell>
												<TableCell className="font-heading text-xs text-(--ink-3)">
													{refund.merchantId}
												</TableCell>
												<TableCell className="font-heading text-xs text-(--ink-3)">
													{refund.invoiceId}
												</TableCell>
												<TableCell className="text-(--ink-3)">
													{refund.resolvedByAdminId ?? "—"}
												</TableCell>
												<TableCell className="text-(--ink-3)">
													{formatDate(refund.createdAt)}
												</TableCell>
												<TableCell className="text-(--ink-3)">
													{refund.resolvedAt
														? formatDate(refund.resolvedAt)
														: "—"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Mobile cards */}
							<div className="flex flex-col gap-3 md:hidden">
								{refunds.map((refund) => (
									<div
										key={refund.id}
										className="flex flex-col gap-2 rounded-2xl border border-(--line) bg-(--surface-1) p-4"
									>
										<div className="flex items-start justify-between gap-2">
											<span className="font-medium text-(--ink)">
												{formatNGN(refund.amount)}
											</span>
											<StatusBadge tone={refundStatusTone(refund.status)}>
												{refundStatusLabel(refund.status)}
											</StatusBadge>
										</div>
										<div className="text-sm text-(--ink-2)">
											Invoice {refund.invoiceId}
										</div>
										<div className="text-xs text-(--ink-3)">
											{formatDate(refund.createdAt)}
											{refund.resolvedAt &&
												` · resolved ${formatDate(refund.resolvedAt)} by ${refund.resolvedByAdminId ?? "—"}`}
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
														page <= 1
															? "pointer-events-none opacity-50"
															: undefined
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
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
