import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { SettingsTabs } from "#/components/layout/settings-tabs.tsx";
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
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip.tsx";
import {
	AUDIT_LOGS_PAGE_SIZE,
	auditActionGroups,
	auditActorTypeLabel,
	auditLogsQueryOptions,
	parseSnapshot,
} from "#/data/audit-logs.ts";
import { useCopyToClipboard } from "#/hooks/use-copy-to-clipboard.ts";
import { useDebouncedSearchInput } from "#/hooks/use-debounced-search-input.ts";
import { formatDateTime, formatRelativeTime } from "#/lib/date.ts";
import { pageSizeSchema } from "#/lib/pagination-sizes.ts";

const defaultAuditLogSearch = { q: "", page: 1, size: AUDIT_LOGS_PAGE_SIZE };

const auditLogSearchSchema = z.object({
	action: z.string().optional().catch(undefined),
	q: z.string().default(defaultAuditLogSearch.q),
	page: z.number().default(defaultAuditLogSearch.page),
	size: pageSizeSchema(defaultAuditLogSearch.size),
});

export const Route = createFileRoute("/_dashboard/settings/audit-log")({
	validateSearch: auditLogSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultAuditLogSearch)],
	},
	loaderDeps: ({ search }) => ({
		action: search.action,
		q: search.q,
		page: search.page,
		size: search.size,
	}),
	loader: ({ context, deps }) => {
		// Not awaited — see events.tsx for why (keeps in-app pagination from
		// blocking on this fetch so keepPreviousData can dim-and-swap instead).
		void context.queryClient.prefetchQuery(auditLogsQueryOptions(deps));
	},
	component: SettingsAuditLogPage,
	pendingComponent: () => <ListPageSkeleton columns={5} />,
	head: () => ({ meta: [{ title: "Audit log | SubPilot" }] }),
});

function ResourceIdCell({ id }: { id: string }) {
	const copyToClipboard = useCopyToClipboard();
	const truncated = id.length > 14 ? `${id.slice(0, 14)}…` : id;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						copyToClipboard(id, {
							successMessage: "Resource ID copied",
							duration: 2000,
						});
					}}
					className="font-heading text-xs text-(--ink-2) hover:text-(--ink)"
				>
					{truncated}
				</button>
			</TooltipTrigger>
			<TooltipContent>{id}</TooltipContent>
		</Tooltip>
	);
}

function TimestampCell({ iso }: { iso: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="text-(--ink-3)">{formatRelativeTime(iso)}</span>
			</TooltipTrigger>
			<TooltipContent>{iso}</TooltipContent>
		</Tooltip>
	);
}

function SettingsAuditLogPage() {
	const { action, q, page, size } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { data: logsPage, isPlaceholderData } = useQuery(
		auditLogsQueryOptions({ action, q, page, size }),
	);

	function handleActionChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				action: value === "all" ? undefined : value,
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

	if (!logsPage) {
		return <ListPageSkeleton columns={5} />;
	}

	const logs = logsPage.content;
	const hasActiveFilters = Boolean(action || q.trim());
	const isEmpty = logsPage.totalElements === 0;
	const selectedLog = logs.find((log) => log.id === selectedId) ?? null;
	const pageCount = Math.max(1, logsPage.totalPages);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Audit log
			</h1>

			<SettingsTabs />

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Select value={action ?? "all"} onValueChange={handleActionChange}>
					<SelectTrigger className="w-64 border-(--line) bg-(--surface) px-3">
						<SelectValue placeholder="All actions" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All actions</SelectItem>
						{auditActionGroups.map((g) => (
							<SelectGroup key={g.group}>
								<SelectLabel>{g.group}</SelectLabel>
								{g.actions.map((a) => (
									<SelectItem key={a} value={a}>
										{a}
									</SelectItem>
								))}
							</SelectGroup>
						))}
					</SelectContent>
				</Select>

				<Input
					placeholder="Search actor or resource ID…"
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
								? "No entries match your filters"
								: "No audit log entries yet"}
						</EmptyTitle>
						{!hasActiveFilters && (
							<EmptyDescription className="text-(--ink-3)">
								Entries appear here whenever you or an API key make a change.
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
					<div className="hidden overflow-hidden border border-(--line) bg-(--surface-1) md:block">
						<Table>
							<TableHeader>
								<TableRow className="border-(--line) hover:bg-transparent">
									<TableHead className="text-(--ink-3)">Timestamp</TableHead>
									<TableHead className="text-(--ink-3)">Actor</TableHead>
									<TableHead className="text-(--ink-3)">Action</TableHead>
									<TableHead className="text-(--ink-3)">Resource</TableHead>
									<TableHead className="text-(--ink-3)" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{logs.map((log) => (
									<TableRow
										key={log.id}
										onClick={() => setSelectedId(log.id)}
										className="cursor-pointer border-(--line) hover:bg-(--surface-2)"
									>
										<TableCell>
											<TimestampCell iso={log.createdAt} />
										</TableCell>
										<TableCell onClick={(e) => e.stopPropagation()}>
											<div className="flex items-center gap-2">
												<StatusBadge tone="neutral">
													{auditActorTypeLabel[log.actorType]}
												</StatusBadge>
												<ResourceIdCell id={log.actorId} />
											</div>
										</TableCell>
										<TableCell className="font-heading text-xs text-(--ink)">
											{log.action}
										</TableCell>
										<TableCell onClick={(e) => e.stopPropagation()}>
											<div className="flex items-center gap-2 text-(--ink-2)">
												<span>{log.resourceType}</span>
												<ResourceIdCell id={log.resourceId} />
											</div>
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													setSelectedId(log.id);
												}}
												className="text-(--ink-3) hover:text-(--ink)"
											>
												View diff
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Mobile cards */}
					<div className="flex flex-col gap-3 md:hidden">
						{logs.map((log) => (
							<button
								key={log.id}
								type="button"
								onClick={() => setSelectedId(log.id)}
								className="flex flex-col gap-1.5 rounded-2xl border border-(--line) bg-(--surface-1) p-4 text-left"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-heading text-xs text-(--ink)">
										{log.action}
									</span>
									<TimestampCell iso={log.createdAt} />
								</div>
								<div className="text-sm text-(--ink-2)">
									{log.resourceType} · {log.resourceId}
								</div>
							</button>
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
									{selectedLog.action}
								</SheetTitle>
								<SheetDescription className="text-(--ink-2)">
									{selectedLog.resourceType} · {selectedLog.resourceId}
								</SheetDescription>
							</SheetHeader>
							<div className="flex flex-col gap-4 overflow-y-auto px-8 pb-8">
								<div className="flex flex-col gap-1 text-sm text-(--ink-2)">
									<p className="m-0">
										{auditActorTypeLabel[selectedLog.actorType]}{" "}
										<span className="font-heading text-xs text-(--ink)">
											{selectedLog.actorId}
										</span>
									</p>
									<p className="m-0">
										Occurred at{" "}
										<span className="font-heading text-xs text-(--ink)">
											{formatDateTime(selectedLog.createdAt)}
										</span>
									</p>
								</div>
								<div>
									<p className="island-kicker m-0">Before</p>
									<pre className="mt-1.5 max-h-64 overflow-auto rounded-md bg-(--surface-2) p-3 font-heading text-xs text-(--ink-2)">
										{selectedLog.beforeSnapshot
											? JSON.stringify(
													parseSnapshot(selectedLog.beforeSnapshot),
													null,
													2,
												)
											: "—"}
									</pre>
								</div>
								<div>
									<p className="island-kicker m-0">After</p>
									<pre className="mt-1.5 max-h-64 overflow-auto rounded-md bg-(--surface-2) p-3 font-heading text-xs text-(--ink-2)">
										{selectedLog.afterSnapshot
											? JSON.stringify(
													parseSnapshot(selectedLog.afterSnapshot),
													null,
													2,
												)
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
