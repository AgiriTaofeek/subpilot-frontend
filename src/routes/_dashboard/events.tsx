import { CopyIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

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
	auditEventTypeGroups,
	EVENTS_PAGE_SIZE,
	eventsListQueryOptions,
	parsePayload,
	payloadPreview,
	resourceTypeLabel,
} from "#/data/events.ts";
import { useCopyToClipboard } from "#/hooks/use-copy-to-clipboard.ts";
import { useDebouncedSearchInput } from "#/hooks/use-debounced-search-input.ts";
import { formatDateTime, formatRelativeTime } from "#/lib/date.ts";
import { pageSizeSchema } from "#/lib/pagination-sizes.ts";

const defaultEventsSearch = { q: "", page: 1, size: EVENTS_PAGE_SIZE };

const eventsSearchSchema = z.object({
	eventType: z.string().optional().catch(undefined),
	q: z.string().default(defaultEventsSearch.q),
	page: z.number().default(defaultEventsSearch.page),
	size: pageSizeSchema(defaultEventsSearch.size),
});

export const Route = createFileRoute("/_dashboard/events")({
	validateSearch: eventsSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultEventsSearch)],
	},
	loaderDeps: ({ search }) => ({
		eventType: search.eventType,
		q: search.q,
		page: search.page,
		size: search.size,
	}),
	loader: ({ context, deps }) => {
		// Not awaited: keeps in-app pagination (page/filter/size changes) from
		// blocking the route transition on this fetch, so the component's
		// useQuery + placeholderData: keepPreviousData below can show the
		// previous page (dimmed) instead of a full skeleton swap while the new
		// page loads. Cold/first-load requests still populate the cache here —
		// they just don't hold up the render, so a direct link to page N briefly
		// shows the table's own loading state instead of full SSR content.
		void context.queryClient.prefetchQuery(eventsListQueryOptions(deps));
	},
	component: EventsPage,
	pendingComponent: () => <ListPageSkeleton columns={5} />,
	head: () => ({ meta: [{ title: "Events | SubPilot" }] }),
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

function EventsPage() {
	const { eventType, q, page, size } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const copyToClipboard = useCopyToClipboard();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { data: eventsPage, isPlaceholderData } = useQuery(
		eventsListQueryOptions({ eventType, q, page, size }),
	);

	function handleEventTypeChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				eventType: value === "all" ? undefined : value,
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

	if (!eventsPage) {
		return <ListPageSkeleton columns={5} />;
	}

	const events = eventsPage.content;
	const hasAnyEvents = eventsPage.totalElements > 0;
	const hasActiveFilters = Boolean(eventType || q.trim());
	const selectedEvent = events.find((e) => e.id === selectedId) ?? null;
	const pageCount = Math.max(1, eventsPage.totalPages);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Events
			</h1>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Select
					value={eventType ?? "all"}
					onValueChange={handleEventTypeChange}
				>
					<SelectTrigger className="w-64 rounded-md border-(--line) bg-(--surface) px-3">
						<SelectValue placeholder="All event types" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All event types</SelectItem>
						{auditEventTypeGroups.map((g) => (
							<SelectGroup key={g.group}>
								<SelectLabel>{g.group}</SelectLabel>
								{g.events.map((ev) => (
									<SelectItem key={ev} value={ev}>
										{ev}
									</SelectItem>
								))}
							</SelectGroup>
						))}
					</SelectContent>
				</Select>

				<Input
					placeholder="Search subscription ID…"
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					className="w-full border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30 sm:max-w-64"
				/>
			</div>

			{!hasAnyEvents ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							{hasActiveFilters
								? "No events match your filters"
								: "No events yet"}
						</EmptyTitle>
						{!hasActiveFilters && (
							<EmptyDescription className="text-(--ink-3)">
								Create a plan or run a checkout to start seeing events here.
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
									<TableHead className="text-(--ink-3)">Timestamp</TableHead>
									<TableHead className="text-(--ink-3)">Type</TableHead>
									<TableHead className="text-(--ink-3)">Resource</TableHead>
									<TableHead className="text-(--ink-3)">Resource ID</TableHead>
									<TableHead className="text-(--ink-3)">Payload</TableHead>
									<TableHead className="text-(--ink-3)" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{events.map((event) => (
									<TableRow
										key={event.id}
										onClick={() => setSelectedId(event.id)}
										className="cursor-pointer border-(--line) hover:bg-(--surface-2)"
									>
										<TableCell>
											<TimestampCell iso={event.createdAt} />
										</TableCell>
										<TableCell className="font-heading text-xs text-(--ink)">
											{event.type}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{resourceTypeLabel(event.resourceType)}
										</TableCell>
										<TableCell onClick={(e) => e.stopPropagation()}>
											<ResourceIdCell id={event.resourceId} />
										</TableCell>
										<TableCell className="max-w-72 truncate font-heading text-xs text-(--ink-3)">
											{payloadPreview(event.payload)}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													setSelectedId(event.id);
												}}
												className="text-(--ink-3) hover:text-(--ink)"
											>
												View JSON
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Mobile cards */}
					<div className="flex flex-col gap-3 md:hidden">
						{events.map((event) => (
							<button
								key={event.id}
								type="button"
								onClick={() => setSelectedId(event.id)}
								className="flex flex-col gap-1.5 rounded-2xl border border-(--line) bg-(--surface-1) p-4 text-left"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-heading text-xs text-(--ink)">
										{event.type}
									</span>
									<TimestampCell iso={event.createdAt} />
								</div>
								<div className="text-sm text-(--ink-2)">
									{resourceTypeLabel(event.resourceType)} · {event.resourceId}
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
					{selectedEvent && (
						<>
							<SheetHeader className="pb-4">
								<SheetTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
									{selectedEvent.type}
								</SheetTitle>
								<SheetDescription className="text-(--ink-2)">
									{resourceTypeLabel(selectedEvent.resourceType)} ·{" "}
									{selectedEvent.resourceId}
								</SheetDescription>
							</SheetHeader>
							<div className="flex flex-col gap-4 overflow-y-auto px-8 pb-8">
								<div className="flex flex-col gap-1 text-sm text-(--ink-2)">
									<p className="m-0">
										Occurred at{" "}
										<span className="font-heading text-xs text-(--ink)">
											{formatDateTime(selectedEvent.createdAt)}
										</span>
									</p>
								</div>
								<div>
									<div className="flex items-center justify-between">
										<p className="island-kicker m-0">Payload</p>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() =>
												copyToClipboard(
													JSON.stringify(
														parsePayload(selectedEvent.payload),
														null,
														2,
													),
													{ successMessage: "Payload copied", duration: 2000 },
												)
											}
											className="text-(--ink-3) hover:text-(--ink)"
										>
											<CopyIcon className="size-3.5" />
										</Button>
									</div>
									<pre className="mt-1.5 max-h-96 overflow-auto rounded-md bg-(--surface-2) p-3 font-heading text-xs text-(--ink-2)">
										{JSON.stringify(
											parsePayload(selectedEvent.payload),
											null,
											2,
										)}
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
