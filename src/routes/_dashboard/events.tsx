import { CopyIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
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
import { Input } from "#/components/ui/input.tsx";
import { ListPageSkeleton } from "#/components/ui/page-skeleton.tsx";
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
	eventsListQueryOptions,
	parsePayload,
	payloadPreview,
	resourceTypeLabel,
} from "#/data/events.ts";
import { formatDateTime, formatRelativeTime } from "#/lib/date.ts";

const defaultEventsSearch = { q: "" };

const eventsSearchSchema = z.object({
	eventType: z.string().optional().catch(undefined),
	q: z.string().default(defaultEventsSearch.q),
});

export const Route = createFileRoute("/_dashboard/events")({
	validateSearch: eventsSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultEventsSearch)],
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(eventsListQueryOptions());
	},
	component: EventsPage,
	pendingComponent: () => <ListPageSkeleton columns={5} />,
	head: () => ({ meta: [{ title: "Events | SubPilot" }] }),
});

async function copyText(text: string, label: string) {
	try {
		await navigator.clipboard.writeText(text);
		toast.success(`${label} copied`, { duration: 2000 });
	} catch {
		toast.error("Couldn't copy to clipboard.");
	}
}

function ResourceIdCell({ id }: { id: string }) {
	const truncated = id.length > 14 ? `${id.slice(0, 14)}…` : id;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						copyText(id, "Resource ID");
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
	const { eventType, q } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { data: auditEvents } = useSuspenseQuery(eventsListQueryOptions());

	function handleEventTypeChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				eventType: value === "all" ? undefined : value,
			}),
			resetScroll: false,
		});
	}

	function handleSearchChange(value: string) {
		navigate({
			search: (prev) => ({ ...prev, q: value }),
			replace: true,
			resetScroll: false,
		});
	}

	const filtered = auditEvents
		.filter((e) => !eventType || e.type === eventType)
		.filter((e) => {
			const query = q.trim().toLowerCase();
			if (!query) return true;
			return (
				(e.subscriptionId ?? "").toLowerCase().includes(query) ||
				e.resourceId.toLowerCase().includes(query)
			);
		})
		.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

	const hasAnyEvents = auditEvents.length > 0;
	const selectedEvent = auditEvents.find((e) => e.id === selectedId) ?? null;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Events
			</h1>

			{hasAnyEvents && (
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
						value={q}
						onChange={(e) => handleSearchChange(e.target.value)}
						className="w-full border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30 sm:max-w-64"
					/>
				</div>
			)}

			{!hasAnyEvents ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No events yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Create a plan or run a checkout to start seeing events here.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : filtered.length === 0 ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No events match your filters
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
									<TableHead className="text-(--ink-3)">Timestamp</TableHead>
									<TableHead className="text-(--ink-3)">Type</TableHead>
									<TableHead className="text-(--ink-3)">Resource</TableHead>
									<TableHead className="text-(--ink-3)">Resource ID</TableHead>
									<TableHead className="text-(--ink-3)">Payload</TableHead>
									<TableHead className="text-(--ink-3)" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map((event) => (
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
						{filtered.map((event) => (
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
												copyText(
													JSON.stringify(
														parsePayload(selectedEvent.payload),
														null,
														2,
													),
													"Payload",
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
