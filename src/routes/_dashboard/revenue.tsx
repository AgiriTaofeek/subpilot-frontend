import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { z } from "zod";

import { Button } from "#/components/ui/button.tsx";
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
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
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
import {
	invoiceStatusLabel,
	invoiceStatusTone,
	invoicesListQueryOptions,
} from "#/data/invoices.ts";
import {
	dailyChartForWindow,
	ledgerInvoicesForWindow,
	type RevenueWindow,
	revenueSummaryQueryOptions,
} from "#/data/revenue.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatChartDate } from "#/lib/date.ts";

const revenueWindows = ["7d", "30d", "90d"] as const;

const defaultRevenueSearch = { window: "30d" as const };

const revenueSearchSchema = z.object({
	window: z.enum(revenueWindows).default(defaultRevenueSearch.window),
});

export const Route = createFileRoute("/_dashboard/revenue")({
	validateSearch: revenueSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultRevenueSearch)],
	},
	loaderDeps: ({ search }) => ({ window: search.window }),
	loader: async ({ context, deps }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(invoicesListQueryOptions()),
			context.queryClient.ensureQueryData(
				revenueSummaryQueryOptions(deps.window),
			),
		]);
	},
	component: RevenuePage,
	head: () => ({ meta: [{ title: "Revenue | SubPilot" }] }),
});

const chartConfig = {
	gross: { label: "Gross", color: "var(--ink-3)" },
	net: { label: "Net", color: "var(--brand)" },
} satisfies ChartConfig;

function windowLabelText(window: RevenueWindow): string {
	return window === "7d" ? "7 days" : window === "30d" ? "30 days" : "90 days";
}

// Invoice number/date/amounts/status are all backend-controlled today, but
// quoting unconditionally means this export never silently breaks if a
// free-text field (e.g. a customer-supplied cancellation reason) is ever
// added to this row.
function csvField(value: string | number): string {
	return `"${String(value).replace(/"/g, '""')}"`;
}

function RevenuePage() {
	const { window } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const { data: allInvoices } = useSuspenseQuery(invoicesListQueryOptions());
	const { data: summary } = useSuspenseQuery(
		revenueSummaryQueryOptions(window),
	);

	function handleWindowChange(value: string) {
		if (!value) return;
		navigate({
			search: (prev) => ({ ...prev, window: value as RevenueWindow }),
			resetScroll: false,
		});
	}

	function exportLedgerCsv() {
		const header = "Invoice,Date,Gross,Fee,Net,Status";
		const rows = ledgerInvoices.map((i) =>
			[
				i.number,
				i.createdAt.slice(0, 10),
				i.grossKobo / 100,
				i.feeKobo / 100,
				i.netKobo / 100,
				i.status,
			]
				.map(csvField)
				.join(","),
		);
		const csv = [header, ...rows].join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `revenue-ledger-${window}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const grossKobo = summary.current.totalGrossAmount;
	const feeKobo = summary.current.totalFeeAmount;
	const netKobo = summary.current.totalNetAmount;
	const priorNetKobo = summary.prior.totalNetAmount;
	const feeRate = grossKobo > 0 ? (feeKobo / grossKobo) * 100 : 0;
	const feeBpsPercent = summary.rate.feeBps / 100;

	const hasDelta = priorNetKobo > 0;
	const deltaPct = hasDelta
		? ((netKobo - priorNetKobo) / priorNetKobo) * 100
		: 0;
	const isUp = deltaPct >= 0;

	const chartData = dailyChartForWindow(allInvoices, window).map((d) => ({
		date: d.date,
		gross: d.grossKobo,
		net: d.netKobo,
	}));

	const ledgerInvoices = ledgerInvoicesForWindow(allInvoices, window);

	const hasAnyRevenue = allInvoices.length > 0;

	if (!hasAnyRevenue) {
		return (
			<div className="flex flex-1 items-center justify-center p-10">
				<Empty className="max-w-sm rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No revenue yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Publish a plan and complete a checkout to start seeing gross,
							fees, and net revenue here.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button
							asChild
							className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							<Link to="/plans">View plans</Link>
						</Button>
					</EmptyContent>
				</Empty>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
						Revenue
					</h1>
					<p className="mt-1 text-sm text-(--ink-3)">
						Track gross collections, fees, and what lands as net revenue.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<ToggleGroup
						type="single"
						variant="outline"
						size="sm"
						value={window}
						onValueChange={handleWindowChange}
					>
						{revenueWindows.map((w) => (
							<ToggleGroupItem
								key={w}
								value={w}
								className="rounded-full border-(--line) px-4 text-xs font-medium normal-case tracking-normal data-[state=on]:bg-(--surface-2) data-[state=on]:text-(--ink)"
							>
								{w}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					<Button
						variant="outline"
						size="sm"
						onClick={exportLedgerCsv}
						className="border-(--line)"
					>
						Export
					</Button>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="flex flex-col gap-2 pt-6">
						<p className="island-kicker m-0">
							Net revenue · last {windowLabelText(window)}
						</p>
						<p className="text-4xl font-semibold tracking-tight text-(--ink)">
							{formatNGN(netKobo)}
						</p>
						{hasDelta && (
							<p className="flex items-center gap-1.5 text-sm text-(--ink-3)">
								<StatusBadge tone={isUp ? "success" : "danger"}>
									{isUp ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(0)}%
								</StatusBadge>
								vs previous {windowLabelText(window)}
							</p>
						)}
						<p className="text-sm text-(--ink-3)">
							{isUp
								? "Collections outpaced the previous period, mostly from steady renewals."
								: "Collections slowed slightly versus the previous period."}
						</p>
					</CardContent>
				</Card>

				<div className="flex flex-col gap-3">
					<Card className="border border-(--line) bg-(--surface-1) shadow-none">
						<CardContent className="py-4">
							<p className="island-kicker m-0">Gross</p>
							<p className="mt-1 text-lg font-semibold text-(--ink)">
								{formatNGN(grossKobo)}
							</p>
						</CardContent>
					</Card>
					<Card className="border border-(--line) bg-(--surface-1) shadow-none">
						<CardContent className="py-4">
							<p className="island-kicker m-0">Platform fees</p>
							<p className="mt-1 text-lg font-semibold text-(--ink)">
								{formatNGN(feeKobo)}
							</p>
						</CardContent>
					</Card>
					<Card className="border border-(--line) bg-(--surface-1) shadow-none">
						<CardContent className="py-4">
							<p className="island-kicker m-0">Effective fee rate</p>
							<p className="mt-1 text-lg font-semibold text-(--ink)">
								{feeRate.toFixed(2)}%
							</p>
						</CardContent>
					</Card>
				</div>
			</div>

			<div className="rounded-md bg-(--surface-2) p-3 text-sm text-(--ink-2)">
				SubPilot charges{" "}
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="cursor-help underline decoration-dotted underline-offset-2">
							{feeBpsPercent}%
						</span>
					</TooltipTrigger>
					<TooltipContent>{summary.rate.feeBps} basis points</TooltipContent>
				</Tooltip>{" "}
				+ {formatNGN(summary.rate.feeFixedMinor)} per successful payment.
				{summary.rate.isOverride && " This rate is a custom override."} Fees are
				deducted from gross before net is calculated.
			</div>

			<Card className="border border-(--line) bg-(--surface-1) shadow-none">
				<CardHeader>
					<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
						Gross vs net
					</CardTitle>
				</CardHeader>
				<CardContent>
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
											name === "gross" ? " Gross" : " Net",
										]}
									/>
								}
							/>
							<Area
								dataKey="gross"
								type="monotone"
								stroke="var(--color-gross)"
								fill="var(--color-gross)"
								fillOpacity={0.08}
								strokeWidth={1.5}
							/>
							<Area
								dataKey="net"
								type="monotone"
								stroke="var(--color-net)"
								fill="var(--color-net)"
								fillOpacity={0.18}
								strokeWidth={2}
							/>
						</AreaChart>
					</ChartContainer>
				</CardContent>
			</Card>

			<Card className="border border-(--line) bg-(--surface-1) shadow-none">
				<CardHeader>
					<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
						Ledger
					</CardTitle>
				</CardHeader>
				<CardContent>
					{ledgerInvoices.length === 0 ? (
						<p className="text-sm text-(--ink-3)">
							No ledger entries in this window.
						</p>
					) : (
						<>
							{/* Desktop table */}
							<div className="hidden overflow-hidden border border-(--line) md:block">
								<Table>
									<TableHeader>
										<TableRow className="border-(--line) hover:bg-transparent">
											<TableHead className="text-(--ink-3)">Invoice</TableHead>
											<TableHead className="text-(--ink-3)">Date</TableHead>
											<TableHead className="text-(--ink-3)">Gross</TableHead>
											<TableHead className="text-(--ink-3)">Fee</TableHead>
											<TableHead className="text-(--ink-3)">Net</TableHead>
											<TableHead className="text-(--ink-3)">Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{ledgerInvoices.map((invoice) => {
											const dim = invoice.status === "void";
											return (
												<TableRow key={invoice.id} className="border-(--line)">
													<TableCell
														className={`font-heading text-xs ${dim ? "text-(--ink-3)" : "text-(--ink)"}`}
													>
														{invoice.number}
													</TableCell>
													<TableCell className="text-(--ink-3)">
														{invoice.createdAt.slice(0, 10)}
													</TableCell>
													<TableCell
														className={
															dim ? "text-(--ink-3)" : "text-(--ink-2)"
														}
													>
														{formatNGN(invoice.grossKobo)}
													</TableCell>
													<TableCell
														className={
															dim ? "text-(--ink-3)" : "text-(--ink-2)"
														}
													>
														{invoice.status === "paid"
															? formatNGN(invoice.feeKobo)
															: "—"}
													</TableCell>
													<TableCell
														className={dim ? "text-(--ink-3)" : "text-(--ink)"}
													>
														{invoice.status === "paid"
															? formatNGN(invoice.netKobo)
															: "—"}
													</TableCell>
													<TableCell>
														<StatusBadge
															tone={invoiceStatusTone[invoice.status]}
														>
															{invoiceStatusLabel[invoice.status]}
														</StatusBadge>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>

							{/* Mobile cards */}
							<div className="flex flex-col gap-3 md:hidden">
								{ledgerInvoices.map((invoice) => {
									const dim = invoice.status === "void";
									return (
										<div
											key={invoice.id}
											className="flex flex-col gap-1.5 rounded-md border border-(--line) p-3"
										>
											<div className="flex items-center justify-between gap-2">
												<span
													className={`font-heading text-xs ${dim ? "text-(--ink-3)" : "text-(--ink)"}`}
												>
													{invoice.number}
												</span>
												<StatusBadge tone={invoiceStatusTone[invoice.status]}>
													{invoiceStatusLabel[invoice.status]}
												</StatusBadge>
											</div>
											<div
												className={`text-sm ${dim ? "text-(--ink-3)" : "text-(--ink-2)"}`}
											>
												Gross {formatNGN(invoice.grossKobo)} · Net{" "}
												{invoice.status === "paid"
													? formatNGN(invoice.netKobo)
													: "—"}
											</div>
											<div className="text-xs text-(--ink-3)">
												{invoice.createdAt.slice(0, 10)}
											</div>
										</div>
									);
								})}
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
