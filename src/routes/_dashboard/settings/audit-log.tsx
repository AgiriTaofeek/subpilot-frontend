import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
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
	auditActionGroups,
	auditActorTypeLabel,
	auditLogsQueryOptions,
	parseSnapshot,
} from "#/data/audit-logs.ts";
import { formatDateTime, formatRelativeTime } from "#/lib/date.ts";

const defaultAuditLogSearch = { q: "" };

const auditLogSearchSchema = z.object({
	action: z.string().optional().catch(undefined),
	q: z.string().default(defaultAuditLogSearch.q),
});

export const Route = createFileRoute("/_dashboard/settings/audit-log")({
	validateSearch: auditLogSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultAuditLogSearch)],
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(auditLogsQueryOptions());
	},
	component: SettingsAuditLogPage,
	head: () => ({ meta: [{ title: "Audit log | SubPilot" }] }),
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

function SettingsAuditLogPage() {
	const { action, q } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { data: logs } = useSuspenseQuery(auditLogsQueryOptions());

	function handleActionChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				action: value === "all" ? undefined : value,
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

	const filtered = logs
		.filter((log) => !action || log.action === action)
		.filter((log) => {
			const query = q.trim().toLowerCase();
			if (!query) return true;
			return (
				log.resourceId.toLowerCase().includes(query) ||
				log.actorId.toLowerCase().includes(query)
			);
		})
		.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

	const hasAnyLogs = logs.length > 0;
	const selectedLog = logs.find((log) => log.id === selectedId) ?? null;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Audit log
			</h1>

			<SettingsTabs />

			{hasAnyLogs && (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<Select value={action ?? "all"} onValueChange={handleActionChange}>
						<SelectTrigger className="w-64 rounded-md border-(--line) bg-(--surface) px-3">
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
						value={q}
						onChange={(e) => handleSearchChange(e.target.value)}
						className="w-full border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30 sm:max-w-64"
					/>
				</div>
			)}

			{!hasAnyLogs ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No audit log entries yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Entries appear here whenever you or an API key make a change.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : filtered.length === 0 ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No entries match your filters
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
									<TableHead className="text-(--ink-3)">Actor</TableHead>
									<TableHead className="text-(--ink-3)">Action</TableHead>
									<TableHead className="text-(--ink-3)">Resource</TableHead>
									<TableHead className="text-(--ink-3)" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map((log) => (
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
						{filtered.map((log) => (
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
