import { CopyIcon, FunnelIcon } from "@phosphor-icons/react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
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
	SheetDescription,
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip.tsx";
import { auditEventTypeGroups } from "#/data/events.ts";
import {
	deliveryStatusLabel,
	deliveryStatusTone,
	httpStatusColor,
	WEBHOOK_DELIVERIES_PAGE_SIZE,
	webhookDeliveriesListQueryOptions,
} from "#/data/webhook-deliveries.ts";
import { webhookEndpointsListQueryOptions } from "#/data/webhooks.ts";
import { useCopyToClipboard } from "#/hooks/use-copy-to-clipboard.ts";
import { pageSizeSchema } from "#/lib/pagination-sizes.ts";
import type { WebhookDeliveryStatusDto } from "#/types/api.ts";

const statusValues = ["succeeded", "pending", "failed"] as const;

const defaultDeliveriesSearch = {
	page: 1,
	size: WEBHOOK_DELIVERIES_PAGE_SIZE,
};

const deliveriesSearchSchema = z.object({
	page: z.number().default(defaultDeliveriesSearch.page),
	status: z.enum(statusValues).optional().catch(undefined),
	endpointId: z.string().optional().catch(undefined),
	eventType: z.string().optional().catch(undefined),
	size: pageSizeSchema(defaultDeliveriesSearch.size),
});

export const Route = createFileRoute("/_dashboard/webhooks/deliveries")({
	validateSearch: deliveriesSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultDeliveriesSearch)],
	},
	loaderDeps: ({ search }) => ({
		page: search.page,
		status: search.status,
		endpointId: search.endpointId,
		eventType: search.eventType,
		size: search.size,
	}),
	loader: async ({ context, deps }) => {
		// Deliveries: not awaited — see events.tsx for why. Endpoints: still
		// awaited, since it's small reference data for the filter dropdowns,
		// not the paginated resource.
		void context.queryClient.prefetchQuery(
			webhookDeliveriesListQueryOptions(deps),
		);
		await context.queryClient.ensureQueryData(
			webhookEndpointsListQueryOptions(),
		);
	},
	component: WebhookDeliveriesPage,
	pendingComponent: () => <ListPageSkeleton columns={6} />,
	head: () => ({ meta: [{ title: "Webhook deliveries | SubPilot" }] }),
});

const allEventTypes = auditEventTypeGroups.flatMap((g) => g.events).sort();

function formatDateTime(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function EventIdCell({ id }: { id: string }) {
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
							successMessage: "Event ID copied",
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

function CodeBlock({ label, content }: { label: string; content: string }) {
	const copyToClipboard = useCopyToClipboard();
	return (
		<div>
			<div className="flex items-center justify-between">
				<p className="island-kicker m-0">{label}</p>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() =>
						copyToClipboard(content, {
							successMessage: `${label} copied`,
							duration: 2000,
						})
					}
					className="text-(--ink-3) hover:text-(--ink)"
				>
					<CopyIcon className="size-3.5" />
				</Button>
			</div>
			<pre className="mt-1.5 max-h-64 overflow-auto rounded-md bg-(--surface-2) p-3 font-heading text-xs text-(--ink-2)">
				{content || "—"}
			</pre>
		</div>
	);
}

function WebhookDeliveriesPage() {
	const { page, status, endpointId, eventType, size } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: deliveriesPage, isPlaceholderData } = useQuery(
		webhookDeliveriesListQueryOptions({
			page,
			status,
			endpointId,
			eventType,
			size,
		}),
	);
	const { data: endpoints } = useSuspenseQuery(
		webhookEndpointsListQueryOptions(),
	);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	function handleSizeChange(nextSize: number) {
		navigate({
			search: (prev) => ({ ...prev, size: nextSize, page: 1 }),
			resetScroll: false,
		});
	}

	function handleStatusFilterChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				status: (value || undefined) as WebhookDeliveryStatusDto | undefined,
				page: 1,
			}),
			resetScroll: false,
		});
	}

	function handleEndpointFilterChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				endpointId: value === "all" ? undefined : value,
				page: 1,
			}),
			resetScroll: false,
		});
	}

	function handleEventFilterChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				eventType: value === "all" ? undefined : value,
				page: 1,
			}),
			resetScroll: false,
		});
	}

	if (!deliveriesPage) {
		return <ListPageSkeleton columns={6} />;
	}

	const deliveries = deliveriesPage.content;
	const pageCount = Math.max(1, deliveriesPage.totalPages);
	const hasActiveFilters = Boolean(status || endpointId || eventType);
	const isEmpty = deliveriesPage.totalElements === 0;

	const selectedDelivery = deliveries.find((d) => d.id === selectedId) ?? null;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Webhook deliveries
			</h1>

			<div className="flex flex-col gap-3">
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					value={status ?? ""}
					onValueChange={handleStatusFilterChange}
					className="overflow-x-auto"
				>
					{statusValues.map((s) => (
						<ToggleGroupItem
							key={s}
							value={s}
							className="rounded-full border-(--line) px-4 text-xs font-medium normal-case tracking-normal data-[state=on]:bg-(--surface-2) data-[state=on]:text-(--ink)"
						>
							{deliveryStatusLabel[s]}
						</ToggleGroupItem>
					))}
				</ToggleGroup>

				{/* Desktop: selects inline */}
				<div className="hidden items-center gap-3 sm:flex">
					<Select
						value={endpointId ?? "all"}
						onValueChange={handleEndpointFilterChange}
					>
						<SelectTrigger className="w-56 rounded-md border-(--line) bg-(--surface) px-3">
							<SelectValue placeholder="All endpoints" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All endpoints</SelectItem>
							{endpoints.map((ep) => (
								<SelectItem key={ep.id} value={ep.id}>
									{ep.url}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={eventType ?? "all"}
						onValueChange={handleEventFilterChange}
					>
						<SelectTrigger className="w-56 rounded-md border-(--line) bg-(--surface) px-3">
							<SelectValue placeholder="All events" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All events</SelectItem>
							{allEventTypes.map((ev) => (
								<SelectItem key={ev} value={ev}>
									{ev}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
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
								value={endpointId ?? "all"}
								onValueChange={handleEndpointFilterChange}
							>
								<SelectTrigger className="w-full rounded-md border-(--line) bg-(--surface) px-3">
									<SelectValue placeholder="All endpoints" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All endpoints</SelectItem>
									{endpoints.map((ep) => (
										<SelectItem key={ep.id} value={ep.id}>
											{ep.url}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={eventType ?? "all"}
								onValueChange={handleEventFilterChange}
							>
								<SelectTrigger className="w-full rounded-md border-(--line) bg-(--surface) px-3">
									<SelectValue placeholder="All events" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All events</SelectItem>
									{allEventTypes.map((ev) => (
										<SelectItem key={ev} value={ev}>
											{ev}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</SheetContent>
				</Sheet>
			</div>

			{isEmpty && !hasActiveFilters ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No deliveries yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Deliveries appear here once an event fires to one of your
							endpoints.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : isEmpty ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No deliveries match your filters
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
								<TableRow className="border-(--line) hover:bg-transparent">
									<TableHead className="text-(--ink-3)">Created</TableHead>
									<TableHead className="text-(--ink-3)">Endpoint</TableHead>
									<TableHead className="text-(--ink-3)">Event</TableHead>
									<TableHead className="text-(--ink-3)">HTTP status</TableHead>
									<TableHead className="text-(--ink-3)">Attempts</TableHead>
									<TableHead className="text-(--ink-3)">Status</TableHead>
									<TableHead className="text-(--ink-3)" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{deliveries.map((d) => (
									<TableRow
										key={d.id}
										onClick={() => setSelectedId(d.id)}
										className="cursor-pointer border-(--line) hover:bg-(--surface-2)"
									>
										<TableCell className="text-(--ink-3)">
											{formatDateTime(d.createdAt)}
										</TableCell>
										<TableCell className="max-w-56 truncate font-heading text-xs text-(--ink)">
											{d.endpointUrl}
										</TableCell>
										<TableCell onClick={(e) => e.stopPropagation()}>
											<EventIdCell id={d.eventId} />
										</TableCell>
										<TableCell
											className={`font-heading text-xs ${httpStatusColor(d.responseStatus)}`}
										>
											{d.responseStatus ?? "timeout"}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{d.attemptCount}
										</TableCell>
										<TableCell>
											<StatusBadge tone={deliveryStatusTone[d.status]}>
												{deliveryStatusLabel[d.status]}
											</StatusBadge>
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													setSelectedId(d.id);
												}}
												className="text-(--ink-3) hover:text-(--ink)"
											>
												View
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Mobile cards */}
					<div className="flex flex-col gap-3 md:hidden">
						{deliveries.map((d) => (
							<button
								key={d.id}
								type="button"
								onClick={() => setSelectedId(d.id)}
								className="flex flex-col gap-1.5 rounded-2xl border border-(--line) bg-(--surface-1) p-4 text-left"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="truncate font-heading text-xs text-(--ink)">
										{d.endpointUrl}
									</span>
									<StatusBadge tone={deliveryStatusTone[d.status]}>
										{deliveryStatusLabel[d.status]}
									</StatusBadge>
								</div>
								<div className="truncate font-heading text-xs text-(--ink-2)">
									{d.eventId}
								</div>
								<div className="flex items-center gap-2 text-xs text-(--ink-3)">
									<span className={httpStatusColor(d.responseStatus)}>
										{d.responseStatus ?? "timeout"}
									</span>
									<span>·</span>
									<span>
										{d.attemptCount} attempt{d.attemptCount === 1 ? "" : "s"}
									</span>
									<span>·</span>
									<span>{formatDateTime(d.createdAt)}</span>
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
					{selectedDelivery && (
						<>
							<SheetHeader className="pb-4">
								<SheetTitle className="truncate font-sans text-lg normal-case tracking-tight text-(--ink)">
									{selectedDelivery.endpointUrl}
								</SheetTitle>
								<SheetDescription className="truncate font-heading text-xs text-(--ink-2)">
									Event {selectedDelivery.eventId}
								</SheetDescription>
							</SheetHeader>
							<div className="flex flex-col gap-5 overflow-y-auto px-8 pb-8">
								<div className="flex items-center gap-3">
									<StatusBadge
										tone={deliveryStatusTone[selectedDelivery.status]}
									>
										{deliveryStatusLabel[selectedDelivery.status]}
									</StatusBadge>
									<span
										className={`font-heading text-xs ${httpStatusColor(selectedDelivery.responseStatus)}`}
									>
										{selectedDelivery.responseStatus ?? "timeout"}
									</span>
								</div>

								<div className="flex flex-col gap-1">
									<p className="m-0 text-sm text-(--ink-2)">
										Created at{" "}
										<span className="font-heading text-xs text-(--ink)">
											{formatDateTime(selectedDelivery.createdAt)}
										</span>
									</p>
									<p className="m-0 text-sm text-(--ink-2)">
										Last attempted{" "}
										<span className="font-heading text-xs text-(--ink)">
											{formatDateTime(selectedDelivery.lastAttemptedAt)}
										</span>
									</p>
									<p className="m-0 text-sm text-(--ink-2)">
										{selectedDelivery.attemptCount} attempt
										{selectedDelivery.attemptCount === 1 ? "" : "s"}
										{selectedDelivery.nextRetryAt && (
											<>
												{" "}
												· next retry{" "}
												<span className="font-heading text-xs text-(--ink)">
													{formatDateTime(selectedDelivery.nextRetryAt)}
												</span>
											</>
										)}
									</p>
								</div>

								<CodeBlock
									label="Response body"
									content={selectedDelivery.responseBody ?? ""}
								/>
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}
