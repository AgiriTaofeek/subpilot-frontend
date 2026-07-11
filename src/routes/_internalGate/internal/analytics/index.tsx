import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	getRouteApi,
	Link,
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
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
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
	type AnalyticsWindow,
	analyticsSortFieldLabel,
	analyticsWindows,
	internalAnalyticsQueryOptions,
	merchantRevenueStatusLabel,
	merchantRevenueStatusTone,
} from "#/data/internal-analytics.ts";
import { useDebouncedSearchInput } from "#/hooks/use-debounced-search-input.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatChartDate } from "#/lib/date.ts";
import type { InternalAnalyticsSortFieldDto } from "#/types/api.ts";

const internalGateRouteApi = getRouteApi("/_internalGate");

const sortFields = [
	"GROSS",
	"FEE",
	"NET",
	"TRANSACTIONS",
	"ACTIVE_SUBSCRIPTIONS",
	"NAME",
] as const;

const defaultAnalyticsSearch = {
	window: "30d" as AnalyticsWindow,
	status: "",
	q: "",
	minGross: 0,
	sortBy: "GROSS" as InternalAnalyticsSortFieldDto,
	sortDesc: true,
};

const analyticsSearchSchema = z.object({
	window: z.enum(analyticsWindows).default(defaultAnalyticsSearch.window),
	status: z.string().default(defaultAnalyticsSearch.status),
	q: z.string().default(defaultAnalyticsSearch.q),
	minGross: z.number().default(defaultAnalyticsSearch.minGross),
	sortBy: z.enum(sortFields).default(defaultAnalyticsSearch.sortBy),
	sortDesc: z.boolean().default(defaultAnalyticsSearch.sortDesc),
});

export const Route = createFileRoute("/_internalGate/internal/analytics/")({
	validateSearch: analyticsSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultAnalyticsSearch)],
	},
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) => {
		// Not awaited — see events.tsx for why: filter/sort changes on this
		// page shouldn't block navigation, they should just show the table's
		// own loading state.
		if (context.internalAdminSession.role === "super_admin") {
			void context.queryClient.prefetchQuery(
				internalAnalyticsQueryOptions({
					window: deps.window,
					minGrossMinor: deps.minGross > 0 ? deps.minGross * 100 : undefined,
					merchantStatus: deps.status || undefined,
					nameQuery: deps.q || undefined,
					sortBy: deps.sortBy,
					sortDesc: deps.sortDesc,
				}),
			);
		}
	},
	component: InternalAnalyticsPage,
	pendingComponent: () => <ListPageSkeleton columns={6} />,
	head: () => ({ meta: [{ title: "Analytics | SubPilot Internal" }] }),
});

const chartConfig = {
	gmv: { label: "Platform GMV", color: "var(--ink-3)" },
	revenue: { label: "SubPilot revenue", color: "var(--brand)" },
} satisfies ChartConfig;

function windowLabelText(window: AnalyticsWindow): string {
	return window === "7d" ? "7 days" : window === "30d" ? "30 days" : "90 days";
}

function InternalAnalyticsPage() {
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
							Platform analytics is limited to the super admin role.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</div>
		);
	}

	return <InternalAnalyticsContent />;
}

function InternalAnalyticsContent() {
	const { window, status, q, minGross, sortBy, sortDesc } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const { data, isPlaceholderData } = useQuery(
		internalAnalyticsQueryOptions({
			window,
			minGrossMinor: minGross > 0 ? minGross * 100 : undefined,
			merchantStatus: status || undefined,
			nameQuery: q || undefined,
			sortBy,
			sortDesc,
		}),
	);

	function handleWindowChange(value: string) {
		if (!value) return;
		navigate({
			search: (prev) => ({ ...prev, window: value as AnalyticsWindow }),
			resetScroll: false,
		});
	}

	function handleStatusChange(value: string) {
		navigate({
			search: (prev) => ({ ...prev, status: value === "all" ? "" : value }),
			resetScroll: false,
		});
	}

	function handleSortByChange(value: string) {
		navigate({
			search: (prev) => ({
				...prev,
				sortBy: value as InternalAnalyticsSortFieldDto,
			}),
			resetScroll: false,
		});
	}

	function toggleSortDesc() {
		navigate({
			search: (prev) => ({ ...prev, sortDesc: !prev.sortDesc }),
			resetScroll: false,
		});
	}

	const [searchInput, setSearchInput] = useDebouncedSearchInput(q, (value) => {
		navigate({
			search: (prev) => ({ ...prev, q: value }),
			replace: true,
			resetScroll: false,
		});
	});

	const [minGrossInput, setMinGrossInput] = useDebouncedSearchInput(
		minGross > 0 ? String(minGross) : "",
		(value) => {
			const parsed = Number(value);
			navigate({
				search: (prev) => ({
					...prev,
					minGross: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
				}),
				replace: true,
				resetScroll: false,
			});
		},
	);

	if (!data) {
		return <ListPageSkeleton columns={6} />;
	}

	const { summary, merchants, dailySeries } = data;
	const hasActiveFilters = Boolean(q.trim() || status || minGross > 0);

	const chartData = dailySeries.map((point) => ({
		date: point.date,
		gmv: point.gmvMinor,
		revenue: point.subpilotRevenueMinor,
	}));

	return (
		<div
			className={
				isPlaceholderData
					? "flex flex-1 flex-col gap-6 p-6 opacity-50 transition-opacity"
					: "flex flex-1 flex-col gap-6 p-6"
			}
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
						Analytics
					</h1>
					<p className="mt-1 text-sm text-(--ink-3)">
						Platform-wide revenue and per-merchant breakdown.
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

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">
							SubPilot revenue · last {windowLabelText(window)}
						</p>
						<p className="mt-1 text-2xl font-semibold text-(--ink)">
							{formatNGN(summary.subpilotRevenueMinor)}
						</p>
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Platform GMV</p>
						<p className="mt-1 text-2xl font-semibold text-(--ink)">
							{formatNGN(summary.totalGmvMinor)}
						</p>
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Net paid out to merchants</p>
						<p className="mt-1 text-2xl font-semibold text-(--ink)">
							{formatNGN(summary.totalNetPaidOutMinor)}
						</p>
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Active subscriptions</p>
						<p className="mt-1 text-2xl font-semibold text-(--ink)">
							{summary.activeSubscriptions.toLocaleString()}
						</p>
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">
							New subscriptions · last {windowLabelText(window)}
						</p>
						<p className="mt-1 text-2xl font-semibold text-(--ink)">
							{summary.newSubscriptionsInWindow.toLocaleString()}
						</p>
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Active merchants</p>
						<p className="mt-1 text-2xl font-semibold text-(--ink)">
							{summary.activeMerchants.toLocaleString()}
						</p>
					</CardContent>
				</Card>
			</div>

			<Card className="border border-(--line) bg-(--surface-1) shadow-none">
				<CardHeader>
					<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
						GMV vs SubPilot revenue
					</CardTitle>
				</CardHeader>
				<CardContent>
					{chartData.length === 0 ? (
						<p className="text-sm text-(--ink-3)">
							No revenue in this window yet.
						</p>
					) : (
						<ChartContainer
							config={chartConfig}
							className="aspect-auto h-64 w-full"
						>
							<AreaChart data={chartData} accessibilityLayer>
								<CartesianGrid vertical={false} stroke="var(--line)" />
								<XAxis
									dataKey="date"
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
											formatter={(value, name) => [
												formatNGN(Number(value)),
												name === "gmv" ? " Platform GMV" : " SubPilot revenue",
											]}
										/>
									}
								/>
								<Area
									dataKey="gmv"
									type="monotone"
									stroke="var(--color-gmv)"
									fill="var(--color-gmv)"
									fillOpacity={0.08}
									strokeWidth={1.5}
								/>
								<Area
									dataKey="revenue"
									type="monotone"
									stroke="var(--color-revenue)"
									fill="var(--color-revenue)"
									fillOpacity={0.18}
									strokeWidth={2}
								/>
							</AreaChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>

			<Card className="border border-(--line) bg-(--surface-1) shadow-none">
				<CardHeader>
					<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
						Merchants
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
						<Select value={status || "all"} onValueChange={handleStatusChange}>
							<SelectTrigger className="w-44 border-(--line) bg-(--surface) px-3">
								<SelectValue placeholder="All statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="under_review">Under review</SelectItem>
								<SelectItem value="suspended">Suspended</SelectItem>
							</SelectContent>
						</Select>

						<Input
							placeholder="Search business name…"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className="w-full border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30 sm:max-w-56"
						/>

						<Input
							type="number"
							min={0}
							placeholder="Min gross (₦)"
							value={minGrossInput}
							onChange={(e) => setMinGrossInput(e.target.value)}
							className="w-full border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30 sm:max-w-36"
						/>

						<div className="flex items-center gap-2">
							<Select value={sortBy} onValueChange={handleSortByChange}>
								<SelectTrigger className="w-44 border-(--line) bg-(--surface) px-3">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{sortFields.map((field) => (
										<SelectItem key={field} value={field}>
											{analyticsSortFieldLabel[field]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<button
								type="button"
								onClick={toggleSortDesc}
								className="h-9 border border-(--line) bg-(--surface) px-3 text-sm text-(--ink-2) hover:bg-(--surface-2)"
							>
								{sortDesc ? "↓ Desc" : "↑ Asc"}
							</button>
						</div>
					</div>

					{merchants.length === 0 ? (
						<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
							<EmptyHeader>
								<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
									{hasActiveFilters
										? "No merchants match your filters"
										: "No merchant activity in this window"}
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
											<TableHead className="text-(--ink-3)">Business</TableHead>
											<TableHead className="text-(--ink-3)">Status</TableHead>
											<TableHead className="text-(--ink-3)">Gross</TableHead>
											<TableHead className="text-(--ink-3)">Fee</TableHead>
											<TableHead className="text-(--ink-3)">Net</TableHead>
											<TableHead className="text-(--ink-3)">
												Transactions
											</TableHead>
											<TableHead className="text-(--ink-3)">
												Active subs
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{merchants.map((merchant) => (
											<TableRow
												key={merchant.merchantId}
												className="border-(--line) hover:bg-(--surface-2)"
											>
												<TableCell>
													<Link
														to="/internal/merchants/$merchantId"
														params={{ merchantId: merchant.merchantId }}
														className="text-(--brand) hover:underline"
													>
														{merchant.businessName}
													</Link>
												</TableCell>
												<TableCell>
													<StatusBadge
														tone={merchantRevenueStatusTone(
															merchant.merchantStatus,
														)}
													>
														{merchantRevenueStatusLabel(
															merchant.merchantStatus,
														)}
													</StatusBadge>
												</TableCell>
												<TableCell className="text-(--ink-2)">
													{formatNGN(merchant.grossAmountMinor)}
												</TableCell>
												<TableCell className="text-(--ink-2)">
													{formatNGN(merchant.subpilotFeeMinor)}
												</TableCell>
												<TableCell className="text-(--ink)">
													{formatNGN(merchant.netAmountMinor)}
												</TableCell>
												<TableCell className="text-(--ink-3)">
													{merchant.transactionCount.toLocaleString()}
												</TableCell>
												<TableCell className="text-(--ink-3)">
													{merchant.activeSubscriptions.toLocaleString()}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Mobile cards */}
							<div className="flex flex-col gap-3 md:hidden">
								{merchants.map((merchant) => (
									<Link
										key={merchant.merchantId}
										to="/internal/merchants/$merchantId"
										params={{ merchantId: merchant.merchantId }}
										className="flex flex-col gap-2 rounded-2xl border border-(--line) bg-(--surface-1) p-4 no-underline"
									>
										<div className="flex items-start justify-between gap-2">
											<span className="font-medium text-(--ink)">
												{merchant.businessName}
											</span>
											<StatusBadge
												tone={merchantRevenueStatusTone(
													merchant.merchantStatus,
												)}
											>
												{merchantRevenueStatusLabel(merchant.merchantStatus)}
											</StatusBadge>
										</div>
										<div className="text-sm text-(--ink-2)">
											Gross {formatNGN(merchant.grossAmountMinor)} · Net{" "}
											{formatNGN(merchant.netAmountMinor)}
										</div>
										<div className="text-xs text-(--ink-3)">
											{merchant.transactionCount.toLocaleString()} transactions
											· {merchant.activeSubscriptions.toLocaleString()} active
											subs
										</div>
									</Link>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
