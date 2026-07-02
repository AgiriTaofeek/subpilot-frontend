import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { z } from "zod";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#/components/ui/chart.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group.tsx";
import {
	type AnalyticsWindow,
	analyticsSummaryQueryOptions,
	dunningRecoveryRateQueryOptions,
	paymentSuccessRateQueryOptions,
	revenueOverTimeQueryOptions,
	subscriptionGrowthQueryOptions,
} from "#/data/analytics.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatChartDate } from "#/lib/date.ts";

const analyticsWindows = ["7d", "30d", "90d"] as const;

const defaultAnalyticsSearch = { window: "30d" as const };

const analyticsSearchSchema = z.object({
	window: z.enum(analyticsWindows).default(defaultAnalyticsSearch.window),
});

export const Route = createFileRoute("/_dashboard/analytics")({
	validateSearch: analyticsSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultAnalyticsSearch)],
	},
	loaderDeps: ({ search }) => ({ window: search.window }),
	loader: async ({ context, deps }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				analyticsSummaryQueryOptions(deps.window),
			),
			context.queryClient.ensureQueryData(
				revenueOverTimeQueryOptions(deps.window),
			),
			context.queryClient.ensureQueryData(
				subscriptionGrowthQueryOptions(deps.window),
			),
			context.queryClient.ensureQueryData(
				paymentSuccessRateQueryOptions(deps.window),
			),
			context.queryClient.ensureQueryData(
				dunningRecoveryRateQueryOptions(deps.window),
			),
		]);
	},
	component: AnalyticsPage,
	head: () => ({ meta: [{ title: "Analytics | SubPilot" }] }),
});

const revenueChartConfig = {
	value: { label: "Revenue", color: "var(--brand)" },
} satisfies ChartConfig;

const growthChartConfig = {
	value: { label: "New subscriptions", color: "var(--brand)" },
} satisfies ChartConfig;

const successRateChartConfig = {
	value: { label: "Success rate", color: "var(--success)" },
} satisfies ChartConfig;

const recoveryRateChartConfig = {
	value: { label: "Recovery rate", color: "var(--warning)" },
} satisfies ChartConfig;

function windowLabelText(window: AnalyticsWindow): string {
	return window === "7d" ? "7 days" : window === "30d" ? "30 days" : "90 days";
}

function AnalyticsPage() {
	const { window } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const { data: summary } = useSuspenseQuery(
		analyticsSummaryQueryOptions(window),
	);
	const { data: revenueChart } = useSuspenseQuery(
		revenueOverTimeQueryOptions(window),
	);
	const { data: growthChart } = useSuspenseQuery(
		subscriptionGrowthQueryOptions(window),
	);
	const { data: successRateChart } = useSuspenseQuery(
		paymentSuccessRateQueryOptions(window),
	);
	const { data: recoveryRateChart } = useSuspenseQuery(
		dunningRecoveryRateQueryOptions(window),
	);

	function handleWindowChange(value: string) {
		if (!value) return;
		navigate({
			search: (prev) => ({ ...prev, window: value as AnalyticsWindow }),
			resetScroll: false,
		});
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
						Analytics
					</h1>
					<p className="mt-1 text-sm text-(--ink-3)">
						MRR, growth, and payment health over time.
					</p>
				</div>
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					value={window}
					onValueChange={handleWindowChange}
				>
					{analyticsWindows.map((w) => (
						<ToggleGroupItem
							key={w}
							value={w}
							className="rounded-full border-(--line) px-4 text-xs font-medium normal-case tracking-normal data-[state=on]:bg-(--surface-2) data-[state=on]:text-(--ink)"
						>
							{w}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">MRR</p>
						<p className="mt-1 text-2xl font-semibold text-(--ink)">
							{formatNGN(summary.mrr)}
						</p>
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Active subscribers</p>
						<p className="mt-1 text-2xl font-semibold text-(--ink)">
							{summary.activeSubscribers}
						</p>
						<p className="mt-0.5 text-xs text-(--ink-3)">
							+{summary.newSubscribersInRange} in last {windowLabelText(window)}
						</p>
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Churn rate</p>
						<p className="mt-1 text-2xl font-semibold text-(--ink)">
							{summary.churnRatePercent.toFixed(1)}%
						</p>
						<p className="mt-0.5 text-xs text-(--ink-3)">rolling 30 days</p>
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Payment success rate</p>
						<p className="mt-1 text-2xl font-semibold text-(--ink)">
							{summary.paymentSuccessRatePercent.toFixed(1)}%
						</p>
					</CardContent>
				</Card>
			</div>

			{summary.failedPaymentsCount > 0 && (
				<div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-(--ink-2)">
					<StatusBadge tone="warning">
						{summary.failedPaymentsCount} failed payment
						{summary.failedPaymentsCount === 1 ? "" : "s"}
					</StatusBadge>
					<span>
						{formatNGN(summary.failedPaymentsValue)} currently failed and
						unresolved.
					</span>
				</div>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardHeader>
						<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
							Revenue
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={revenueChartConfig}
							className="aspect-auto h-56 w-full"
						>
							<AreaChart data={revenueChart.points} accessibilityLayer>
								<CartesianGrid vertical={false} stroke="var(--line)" />
								<XAxis
									dataKey="bucket"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									tickFormatter={formatChartDate}
									minTickGap={24}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									tickFormatter={(v: number) => formatNGN(v)}
									width={80}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											labelFormatter={(v) => formatChartDate(String(v))}
											formatter={(value) => [
												formatNGN(Number(value)),
												" Revenue",
											]}
										/>
									}
								/>
								<Area
									dataKey="value"
									type="monotone"
									stroke="var(--color-value)"
									fill="var(--color-value)"
									fillOpacity={0.15}
									strokeWidth={2}
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardHeader>
						<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
							Subscription growth
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={growthChartConfig}
							className="aspect-auto h-56 w-full"
						>
							<AreaChart data={growthChart.points} accessibilityLayer>
								<CartesianGrid vertical={false} stroke="var(--line)" />
								<XAxis
									dataKey="bucket"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									tickFormatter={formatChartDate}
									minTickGap={24}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									width={40}
									allowDecimals={false}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											labelFormatter={(v) => formatChartDate(String(v))}
											formatter={(value) => [
												String(value),
												" New subscriptions",
											]}
										/>
									}
								/>
								<Area
									dataKey="value"
									type="monotone"
									stroke="var(--color-value)"
									fill="var(--color-value)"
									fillOpacity={0.15}
									strokeWidth={2}
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardHeader>
						<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
							Payment success rate
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={successRateChartConfig}
							className="aspect-auto h-56 w-full"
						>
							<AreaChart data={successRateChart.points} accessibilityLayer>
								<CartesianGrid vertical={false} stroke="var(--line)" />
								<XAxis
									dataKey="bucket"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									tickFormatter={formatChartDate}
									minTickGap={24}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									width={40}
									tickFormatter={(v: number) => `${v}%`}
									domain={[0, 100]}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											labelFormatter={(v) => formatChartDate(String(v))}
											formatter={(value) => [`${value}%`, " Success rate"]}
										/>
									}
								/>
								<Area
									dataKey="value"
									type="monotone"
									stroke="var(--color-value)"
									fill="var(--color-value)"
									fillOpacity={0.15}
									strokeWidth={2}
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardHeader>
						<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
							Dunning recovery rate
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={recoveryRateChartConfig}
							className="aspect-auto h-56 w-full"
						>
							<AreaChart data={recoveryRateChart.points} accessibilityLayer>
								<CartesianGrid vertical={false} stroke="var(--line)" />
								<XAxis
									dataKey="bucket"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									tickFormatter={formatChartDate}
									minTickGap={24}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									width={40}
									tickFormatter={(v: number) => `${v}%`}
									domain={[0, 100]}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											labelFormatter={(v) => formatChartDate(String(v))}
											formatter={(value) => [`${value}%`, " Recovery rate"]}
										/>
									}
								/>
								<Area
									dataKey="value"
									type="monotone"
									stroke="var(--color-value)"
									fill="var(--color-value)"
									fillOpacity={0.15}
									strokeWidth={2}
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
