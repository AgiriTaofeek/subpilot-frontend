import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
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
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import {
	INTERNAL_AUDIT_LOGS_PAGE_SIZE,
	internalAuditLogsQueryOptions,
} from "#/data/internal-audit.ts";
import { formatDateTime, formatRelativeTime } from "#/lib/date.ts";
import { pageSizeSchema } from "#/lib/pagination-sizes.ts";

const defaultSearch = { page: 1, size: INTERNAL_AUDIT_LOGS_PAGE_SIZE };

const searchSchema = z.object({
	page: z.number().default(defaultSearch.page),
	size: pageSizeSchema(defaultSearch.size),
});

export const Route = createFileRoute("/_internalGate/internal/audit-log")({
	validateSearch: searchSchema,
	search: {
		middlewares: [stripSearchParams(defaultSearch)],
	},
	loaderDeps: ({ search }) => ({ page: search.page, size: search.size }),
	loader: ({ context, deps }) => {
		// Not awaited — see events.tsx for why.
		void context.queryClient.prefetchQuery(internalAuditLogsQueryOptions(deps));
	},
	component: InternalAuditLogPage,
	pendingComponent: () => <ListPageSkeleton columns={4} />,
	head: () => ({ meta: [{ title: "Internal audit log | SubPilot" }] }),
});

function InternalAuditLogPage() {
	const { page, size } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { data: logsPage, isPlaceholderData } = useQuery(
		internalAuditLogsQueryOptions({ page, size }),
	);

	function handleSizeChange(nextSize: number) {
		navigate({
			search: (prev) => ({ ...prev, size: nextSize, page: 1 }),
			resetScroll: false,
		});
	}

	if (!logsPage) {
		return <ListPageSkeleton columns={4} />;
	}

	const logs = logsPage.content;
	const isEmpty = logsPage.totalElements === 0;
	const selectedLog = logs.find((log) => log.auditId === selectedId) ?? null;
	const pageCount = Math.max(1, logsPage.totalPages);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Internal audit log
			</h1>

			{isEmpty ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No internal audit entries yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Entries appear here whenever staff make a change.
						</EmptyDescription>
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
					<div className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface-1)">
						<Table>
							<TableHeader>
								<TableRow className="border-(--line) hover:bg-transparent">
									<TableHead className="text-(--ink-3)">Timestamp</TableHead>
									<TableHead className="text-(--ink-3)">Actor</TableHead>
									<TableHead className="text-(--ink-3)">Action</TableHead>
									<TableHead className="text-(--ink-3)">Target</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{logs.map((log) => (
									<TableRow
										key={log.auditId}
										onClick={() => setSelectedId(log.auditId)}
										className="cursor-pointer border-(--line) hover:bg-(--surface-2)"
									>
										<TableCell className="text-(--ink-3)">
											{formatRelativeTime(log.createdAt)}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{log.actorEmail}
										</TableCell>
										<TableCell className="font-heading text-xs text-(--ink)">
											{log.actionType}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{log.targetType} · {log.targetId}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
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

			<Sheet
				open={selectedId !== null}
				onOpenChange={(open) => !open && setSelectedId(null)}
			>
				<SheetContent
					side="right"
					className="w-full border-(--line) bg-(--surface-1) sm:max-w-120"
				>
					{selectedLog && (
						<>
							<SheetHeader className="pb-4">
								<SheetTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
									{selectedLog.actionType}
								</SheetTitle>
								<SheetDescription className="text-(--ink-2)">
									{selectedLog.targetType} · {selectedLog.targetId}
								</SheetDescription>
							</SheetHeader>
							<div className="flex flex-col gap-4 overflow-y-auto px-8 pb-8">
								<div className="flex flex-col gap-1 text-sm text-(--ink-2)">
									<p className="m-0">
										{selectedLog.actorEmail}{" "}
										<span className="font-heading text-xs text-(--ink)">
											{selectedLog.actorAdminId}
										</span>
									</p>
									<p className="m-0">
										Occurred at{" "}
										<span className="font-heading text-xs text-(--ink)">
											{formatDateTime(selectedLog.createdAt)}
										</span>
									</p>
									{selectedLog.reason && (
										<p className="m-0">Reason: {selectedLog.reason}</p>
									)}
								</div>
								<div>
									<p className="island-kicker m-0">Before</p>
									<pre className="mt-1.5 max-h-64 overflow-auto rounded-md bg-(--surface-2) p-3 font-heading text-xs text-(--ink-2)">
										{selectedLog.oldValue
											? JSON.stringify(selectedLog.oldValue, null, 2)
											: "—"}
									</pre>
								</div>
								<div>
									<p className="island-kicker m-0">After</p>
									<pre className="mt-1.5 max-h-64 overflow-auto rounded-md bg-(--surface-2) p-3 font-heading text-xs text-(--ink-2)">
										{selectedLog.newValue
											? JSON.stringify(selectedLog.newValue, null, 2)
											: "—"}
									</pre>
								</div>
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}
