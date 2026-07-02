import {
	CheckCircleIcon,
	PlusIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { QueryErrorPanel } from "#/components/layout/query-error-panel.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import { eventsListQueryOptions } from "#/data/events.ts";
import { plansQueryOptions } from "#/data/plans.ts";
import { revenueSummaryQueryOptions } from "#/data/revenue.ts";
import {
	formatRelativeBillingDate,
	subscriptionStatusLabel,
	subscriptionStatusTone,
	subscriptionsListQueryOptions,
} from "#/data/subscriptions.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatDate, formatRelativeTime } from "#/lib/date.ts";

export const Route = createFileRoute("/_dashboard/overview")({
	// Only the primary content (subscriptions + plans) blocks the page
	// loader. Recent activity and the 30d revenue stats are secondary —
	// per docs/frontend-error-and-loading-strategy.md ("slow overview KPIs
	// should not block sidebar rendering... slow secondary cards should not
	// hide the whole page"), they're fetched client-side below so a slow or
	// broken secondary source degrades that one card instead of the page.
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(subscriptionsListQueryOptions()),
			context.queryClient.ensureQueryData(plansQueryOptions()),
		]);
	},
	component: OverviewPage,
	head: () => ({ meta: [{ title: "Overview | SubPilot" }] }),
});

function truncateId(id: string): string {
	return id.length > 12 ? `${id.slice(0, 12)}…` : id;
}

function OverviewPage() {
	const navigate = useNavigate();
	const { data: plans } = useSuspenseQuery(plansQueryOptions());
	const { data: subscriptions } = useSuspenseQuery(
		subscriptionsListQueryOptions(),
	);
	const eventsQuery = useQuery(eventsListQueryOptions());
	const revenueQuery = useQuery(revenueSummaryQueryOptions("30d"));
	const hasPlans = plans.length > 0;

	if (!hasPlans) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center p-10">
				<div className="max-w-sm flex flex-col gap-4 text-center">
					<div className="inline-flex size-12 items-center justify-center rounded-2xl border border-(--brand)/20 bg-(--brand)/10">
						<span className="size-4 rounded-full bg-(--brand)" />
					</div>
					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
							Welcome to SubPilot
						</h1>
						<p className="text-sm leading-relaxed text-(--ink-3)">
							Create a plan to get a hosted checkout link you can share with
							customers.
						</p>
					</div>
					<Button
						asChild
						className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
					>
						<Link to="/plans/new">
							<PlusIcon data-icon="inline-start" />
							Create plan
						</Link>
					</Button>
				</div>
			</div>
		);
	}

	const activeCount = subscriptions.filter((s) => s.status === "active").length;
	const pastDueSubs = subscriptions.filter((s) => s.status === "past_due");
	const pastDueCount = pastDueSubs.length;

	const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
	const newLast30 = subscriptions.filter(
		(s) => new Date(s.createdAt).getTime() >= thirtyDaysAgo,
	).length;

	const recentEvents = eventsQuery.data
		? [...eventsQuery.data]
				.sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				)
				.slice(0, 6)
		: [];

	const recentSubscriptions = [...subscriptions]
		.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)
		.slice(0, 10);

	const atRiskSubs = pastDueSubs.slice(0, 5);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Overview
			</h1>

			{/* Health region */}
			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="border border-(--line) bg-(--surface-1) shadow-none lg:col-span-2">
					<CardHeader>
						<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
							Subscription health
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						<div>
							<p className="m-0 text-4xl font-semibold tracking-tight text-(--ink)">
								{activeCount} active
							</p>
							<p className="m-0 mt-1 text-sm text-(--ink-3)">
								+{newLast30} new in the last 30 days
							</p>
						</div>
						<div
							className={`flex items-center gap-2 text-sm ${
								pastDueCount > 0 ? "text-(--warning)" : "text-(--success)"
							}`}
						>
							{pastDueCount > 0 ? (
								<WarningCircleIcon className="size-4 shrink-0" />
							) : (
								<CheckCircleIcon className="size-4 shrink-0" />
							)}
							{pastDueCount > 0
								? `${pastDueCount} subscription${pastDueCount === 1 ? "" : "s"} are past due`
								: "All subscriptions current"}
						</div>
					</CardContent>
				</Card>

				<div className="flex flex-col gap-3">
					<Card
						className={`shadow-none ${
							pastDueCount > 0
								? "border-amber-500/20 bg-amber-500/5"
								: "border border-(--line) bg-(--surface-1)"
						}`}
					>
						<CardContent className="py-4">
							<p className="island-kicker m-0">Past due</p>
							<p
								className={`mt-1 text-lg font-semibold ${
									pastDueCount > 0 ? "text-(--warning)" : "text-(--ink)"
								}`}
							>
								{pastDueCount}
							</p>
						</CardContent>
					</Card>
					<Card className="border border-(--line) bg-(--surface-1) shadow-none">
						<CardContent className="py-4">
							<p className="island-kicker m-0">Net · last 30d</p>
							{revenueQuery.isPending ? (
								<Skeleton className="mt-1 h-6 w-24 rounded-none" />
							) : revenueQuery.isError ? (
								<p className="mt-1 text-sm text-destructive">Unavailable</p>
							) : (
								<p className="mt-1 text-lg font-semibold text-(--ink)">
									{formatNGN(revenueQuery.data.current.totalNetAmount)}
								</p>
							)}
						</CardContent>
					</Card>
					<Card className="border border-(--line) bg-(--surface-1) shadow-none">
						<CardContent className="py-4">
							<p className="island-kicker m-0">Gross · last 30d</p>
							{revenueQuery.isPending ? (
								<Skeleton className="mt-1 h-6 w-24 rounded-none" />
							) : revenueQuery.isError ? (
								<p className="mt-1 text-sm text-destructive">Unavailable</p>
							) : (
								<p className="mt-1 text-lg font-semibold text-(--ink)">
									{formatNGN(revenueQuery.data.current.totalGrossAmount)}
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Middle row */}
			<div className="grid gap-4 lg:grid-cols-2">
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardHeader>
						<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
							Recent activity
						</CardTitle>
					</CardHeader>
					<CardContent>
						{eventsQuery.isPending ? (
							<div className="flex flex-col gap-2">
								<Skeleton className="h-4 w-full rounded-none" />
								<Skeleton className="h-4 w-3/4 rounded-none" />
								<Skeleton className="h-4 w-5/6 rounded-none" />
							</div>
						) : eventsQuery.isError ? (
							<QueryErrorPanel
								error={eventsQuery.error}
								onRetry={() => eventsQuery.refetch()}
							/>
						) : recentEvents.length === 0 ? (
							<p className="m-0 text-sm text-(--ink-3)">No activity yet.</p>
						) : (
							<div className="flex flex-col">
								{recentEvents.map((event) => (
									<p
										key={event.id}
										className="m-0 border-b border-(--line) py-2 text-sm last:border-0 last:pb-0"
									>
										<span className="font-heading text-xs text-(--ink)">
											{event.type}
										</span>
										<span className="text-(--ink-3)">
											{" "}
											· {truncateId(event.resourceId)} ·{" "}
											{formatRelativeTime(event.createdAt)}
										</span>
									</p>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				<Card
					className={`shadow-none ${
						atRiskSubs.length > 0
							? "border-amber-500/20 bg-amber-500/5"
							: "border border-(--line) bg-(--surface-1)"
					}`}
				>
					<CardHeader>
						<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
							At risk
						</CardTitle>
					</CardHeader>
					<CardContent>
						{atRiskSubs.length === 0 ? (
							<p className="m-0 text-sm text-(--ink-3)">
								No at-risk subscriptions.
							</p>
						) : (
							<>
								<div className="flex flex-col gap-2">
									{atRiskSubs.map((sub) => (
										<Link
											key={sub.id}
											to="/subscriptions/$subscriptionId"
											params={{ subscriptionId: sub.id }}
											className="block rounded-md border border-amber-500/20 bg-(--surface-1) p-3 no-underline"
										>
											<div className="flex items-center justify-between gap-2">
												<span className="font-medium text-(--ink)">
													{sub.customerName}
												</span>
												<span className="text-sm text-(--ink-2)">
													{formatNGN(sub.amountKobo)}
												</span>
											</div>
											<p className="m-0 mt-0.5 text-xs text-(--ink-3)">
												{sub.planName} · past due since{" "}
												{formatDate(sub.updatedAt)}
											</p>
										</Link>
									))}
								</div>
								<Link
									to="/subscriptions"
									search={{ status: "past_due" }}
									className="mt-3 inline-block text-sm font-medium text-(--brand) hover:underline"
								>
									View all past due
								</Link>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Bottom: recent subscriptions */}
			<Card className="border border-(--line) bg-(--surface-1) shadow-none">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
						Recent subscriptions
					</CardTitle>
					<Link
						to="/subscriptions"
						className="text-sm font-medium text-(--brand) hover:underline"
					>
						View all
					</Link>
				</CardHeader>
				<CardContent>
					{/* Desktop table */}
					<div className="hidden overflow-hidden rounded-md border border-(--line) md:block">
						<Table>
							<TableHeader>
								<TableRow className="border-(--line) hover:bg-transparent">
									<TableHead className="text-(--ink-3)">Customer</TableHead>
									<TableHead className="text-(--ink-3)">Plan</TableHead>
									<TableHead className="text-(--ink-3)">Status</TableHead>
									<TableHead className="text-(--ink-3)">Next billing</TableHead>
									<TableHead className="text-(--ink-3)">Amount</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recentSubscriptions.map((sub) => (
									<TableRow
										key={sub.id}
										onClick={() =>
											navigate({
												to: "/subscriptions/$subscriptionId",
												params: { subscriptionId: sub.id },
											})
										}
										className="cursor-pointer border-(--line) hover:bg-(--surface-2)"
									>
										<TableCell className="font-medium text-(--ink)">
											{sub.customerName}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{sub.planName}
										</TableCell>
										<TableCell>
											<StatusBadge tone={subscriptionStatusTone[sub.status]}>
												{subscriptionStatusLabel[sub.status]}
											</StatusBadge>
										</TableCell>
										<TableCell className="text-(--ink-3)">
											{formatRelativeBillingDate(sub.nextBillingDate)}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{formatNGN(sub.amountKobo)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Mobile cards */}
					<div className="flex flex-col gap-3 md:hidden">
						{recentSubscriptions.map((sub) => (
							<Link
								key={sub.id}
								to="/subscriptions/$subscriptionId"
								params={{ subscriptionId: sub.id }}
								className="block flex flex-col gap-1.5 rounded-md border border-(--line) p-3 no-underline"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium text-(--ink)">
										{sub.customerName}
									</span>
									<StatusBadge tone={subscriptionStatusTone[sub.status]}>
										{subscriptionStatusLabel[sub.status]}
									</StatusBadge>
								</div>
								<p className="m-0 text-sm text-(--ink-2)">
									{sub.planName} · {formatNGN(sub.amountKobo)}
								</p>
								<p className="m-0 text-xs text-(--ink-3)">
									Next billing {formatRelativeBillingDate(sub.nextBillingDate)}
								</p>
							</Link>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
