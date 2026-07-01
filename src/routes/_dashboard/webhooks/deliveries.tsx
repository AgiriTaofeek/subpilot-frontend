import { CopyIcon, FunnelIcon } from "@phosphor-icons/react";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "#/components/ui/button.tsx";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
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
	type DeliveryStatus,
	webhookDeliveries as initialDeliveries,
	type WebhookDelivery,
} from "#/data/webhook-deliveries.ts";
import { eventTypeGroups, webhookEndpoints } from "#/data/webhooks.ts";

const statusValues = ["succeeded", "failed", "retrying"] as const;

const allEventTypes = eventTypeGroups.flatMap((g) => g.events);

const defaultDeliveriesSearch = { page: 1 };

const deliveriesSearchSchema = z.object({
	page: z.number().default(defaultDeliveriesSearch.page),
	status: z.enum(statusValues).optional().catch(undefined),
	endpointId: z.string().optional().catch(undefined),
	eventType: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_dashboard/webhooks/deliveries")({
	validateSearch: deliveriesSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultDeliveriesSearch)],
	},
	component: WebhookDeliveriesPage,
	head: () => ({ meta: [{ title: "Webhook deliveries | SubPilot" }] }),
});

const PAGE_SIZE = 10;

const statusTone: Record<DeliveryStatus, "success" | "danger" | "warning"> = {
	succeeded: "success",
	failed: "danger",
	retrying: "warning",
};

const statusLabel: Record<DeliveryStatus, string> = {
	succeeded: "Succeeded",
	failed: "Failed",
	retrying: "Retrying",
};

function statusRank(status: DeliveryStatus): number {
	if (status === "failed") return 0;
	if (status === "retrying") return 1;
	return 2;
}

function endpointUrlFor(endpointId: string): string {
	return (
		webhookEndpoints.find((e) => e.id === endpointId)?.url ?? "Unknown endpoint"
	);
}

function httpStatusColor(status: number | null): string {
	if (status === null) return "text-destructive";
	if (status >= 200 && status < 300) return "text-(--success)";
	if (status >= 300 && status < 400) return "text-(--ink-3)";
	if (status >= 400 && status < 500) return "text-(--warning)";
	return "text-destructive";
}

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

async function copyText(text: string, label: string) {
	await navigator.clipboard.writeText(text);
	toast.success(`${label} copied`, { duration: 2000 });
}

function CodeBlock({ label, content }: { label: string; content: string }) {
	return (
		<div>
			<div className="flex items-center justify-between">
				<p className="island-kicker m-0">{label}</p>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => copyText(content, label)}
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
	const { page, status, endpointId, eventType } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const [deliveries, setDeliveries] =
		useState<WebhookDelivery[]>(initialDeliveries);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [retrying, setRetrying] = useState(false);

	function handleStatusFilterChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				status: (value || undefined) as DeliveryStatus | undefined,
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

	const filtered = deliveries
		.filter((d) => !status || d.status === status)
		.filter((d) => !endpointId || d.endpointId === endpointId)
		.filter((d) => !eventType || d.eventType === eventType)
		.sort((a, b) => {
			const rankDiff = statusRank(a.status) - statusRank(b.status);
			if (rankDiff !== 0) return rankDiff;
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const hasAnyDeliveries = deliveries.length > 0;

	const selectedDelivery = deliveries.find((d) => d.id === selectedId) ?? null;

	function handleRetry() {
		if (!selectedDelivery) return;
		setRetrying(true);
		setTimeout(() => {
			setDeliveries((prev) =>
				prev.map((d) =>
					d.id === selectedDelivery.id
						? {
								...d,
								status: "succeeded",
								httpStatus: 200,
								attempts: d.attempts + 1,
								attemptedAt: new Date().toISOString(),
								durationMs: 120,
								timedOut: false,
							}
						: d,
				),
			);
			setRetrying(false);
			toast.success("Delivery retried successfully");
		}, 900);
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Webhook deliveries
			</h1>

			{hasAnyDeliveries && (
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
								{statusLabel[s]}
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
								{webhookEndpoints.map((ep) => (
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
										{webhookEndpoints.map((ep) => (
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
			)}

			{!hasAnyDeliveries ? (
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
			) : filtered.length === 0 ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No deliveries match your filters
						</EmptyTitle>
					</EmptyHeader>
				</Empty>
			) : (
				<>
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
								{paginated.map((d) => (
									<TableRow
										key={d.id}
										onClick={() => setSelectedId(d.id)}
										className="cursor-pointer border-(--line) hover:bg-(--surface-2)"
									>
										<TableCell className="text-(--ink-3)">
											{formatDateTime(d.createdAt)}
										</TableCell>
										<TableCell className="max-w-56 truncate font-heading text-xs text-(--ink)">
											{endpointUrlFor(d.endpointId)}
										</TableCell>
										<TableCell className="font-heading text-xs text-(--ink-2)">
											{d.eventType}
										</TableCell>
										<TableCell
											className={`font-heading text-xs ${httpStatusColor(d.httpStatus)}`}
										>
											{d.httpStatus ?? "timeout"}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{d.attempts}
										</TableCell>
										<TableCell>
											<StatusBadge tone={statusTone[d.status]}>
												{statusLabel[d.status]}
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
						{paginated.map((d) => (
							<button
								key={d.id}
								type="button"
								onClick={() => setSelectedId(d.id)}
								className="flex flex-col gap-1.5 rounded-2xl border border-(--line) bg-(--surface-1) p-4 text-left"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="truncate font-heading text-xs text-(--ink)">
										{endpointUrlFor(d.endpointId)}
									</span>
									<StatusBadge tone={statusTone[d.status]}>
										{statusLabel[d.status]}
									</StatusBadge>
								</div>
								<div className="font-heading text-xs text-(--ink-2)">
									{d.eventType}
								</div>
								<div className="flex items-center gap-2 text-xs text-(--ink-3)">
									<span className={httpStatusColor(d.httpStatus)}>
										{d.httpStatus ?? "timeout"}
									</span>
									<span>·</span>
									<span>
										{d.attempts} attempt{d.attempts === 1 ? "" : "s"}
									</span>
									<span>·</span>
									<span>{formatDateTime(d.createdAt)}</span>
								</div>
							</button>
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
								<SheetTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
									{selectedDelivery.eventType}
								</SheetTitle>
								<SheetDescription className="truncate text-(--ink-2)">
									{endpointUrlFor(selectedDelivery.endpointId)}
								</SheetDescription>
							</SheetHeader>
							<div className="flex flex-col gap-5 overflow-y-auto px-8 pb-8">
								<div className="flex items-center gap-3">
									<StatusBadge tone={statusTone[selectedDelivery.status]}>
										{statusLabel[selectedDelivery.status]}
									</StatusBadge>
									<span
										className={`font-heading text-xs ${httpStatusColor(selectedDelivery.httpStatus)}`}
									>
										{selectedDelivery.httpStatus ?? "timeout"}
									</span>
								</div>

								<div className="flex flex-col gap-1">
									<p className="m-0 text-sm text-(--ink-2)">
										Attempted at{" "}
										<span className="font-heading text-xs text-(--ink)">
											{selectedDelivery.attemptedAt}
										</span>
									</p>
									<p className="m-0 text-sm text-(--ink-2)">
										{selectedDelivery.timedOut ? (
											<>
												Timed out after{" "}
												<span className="font-heading text-xs text-(--ink)">
													10s
												</span>
											</>
										) : (
											<>
												Delivered in{" "}
												<span className="font-heading text-xs text-(--ink)">
													{selectedDelivery.durationMs}ms
												</span>
											</>
										)}
									</p>
								</div>

								<CodeBlock
									label="Request headers"
									content={JSON.stringify(
										selectedDelivery.requestHeaders,
										null,
										2,
									)}
								/>
								<CodeBlock
									label="Request body"
									content={selectedDelivery.requestBody}
								/>
								<CodeBlock
									label="Response body"
									content={selectedDelivery.responseBody}
								/>

								{selectedDelivery.status === "failed" && (
									<Button
										onClick={handleRetry}
										disabled={retrying}
										className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
									>
										{retrying ? "Retrying…" : "Retry delivery"}
									</Button>
								)}
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}
