import {
	CaretRightIcon,
	DotsThreeIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
import { Field, FieldContent, FieldLabel } from "#/components/ui/field.tsx";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group.tsx";
import {
	Sheet,
	SheetContent,
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
import { Textarea } from "#/components/ui/textarea.tsx";
import { customers } from "#/data/customers.ts";
import {
	type DunningAttemptStatus,
	dunningAttemptsFor,
} from "#/data/dunning.ts";
import {
	invoices as allInvoices,
	invoiceStatusLabel,
	invoiceStatusTone,
} from "#/data/invoices.ts";
import { formatInterval, plans } from "#/data/plans.ts";
import {
	subscriptions as allSubscriptions,
	formatRelativeBillingDate,
	type Subscription,
	type SubscriptionStatus,
	subscriptionStatusLabel,
	subscriptionStatusTone,
} from "#/data/subscriptions.ts";
import { formatNGN } from "#/lib/currency.ts";
import { calculateProration } from "#/lib/proration.ts";

export const Route = createFileRoute(
	"/_dashboard/subscriptions/$subscriptionId",
)({
	component: SubscriptionDetailPage,
	head: () => ({ meta: [{ title: "Subscription | SubPilot" }] }),
});

const transitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
	trialing: ["active", "cancelled"],
	active: ["past_due", "paused", "cancelled"],
	past_due: ["active", "cancelled", "expired"],
	suspended: ["active", "cancelled"],
	paused: ["active", "cancelled"],
	cancelled: [],
	expired: [],
};

const transitionLabels: Record<string, string> = {
	"trialing->active": "trial ends",
	"trialing->cancelled": "cancel",
	"active->past_due": "payment fails",
	"active->paused": "pause",
	"active->cancelled": "cancel",
	"past_due->active": "payment recovers",
	"past_due->cancelled": "dunning exhausted",
	"past_due->expired": "retries exhausted",
	"suspended->active": "resume",
	"suspended->cancelled": "cancel",
	"paused->active": "resume",
	"paused->cancelled": "cancel",
};

const dunningStatusTone: Record<
	DunningAttemptStatus,
	"success" | "warning" | "danger"
> = {
	succeeded: "success",
	retrying: "warning",
	failed: "danger",
};

const dunningStatusLabel: Record<DunningAttemptStatus, string> = {
	succeeded: "Succeeded",
	retrying: "Retrying",
	failed: "Failed",
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function StateMachineDiagram({ current }: { current: SubscriptionStatus }) {
	const reachable = transitions[current];
	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="flex flex-col items-center gap-1.5">
				<div className="flex size-8 items-center justify-center rounded-full border-2 border-(--brand) bg-(--brand)/10">
					<span className="size-2 rounded-full bg-(--brand)" />
				</div>
				<span className="font-heading text-[0.6rem] text-(--ink)">
					{subscriptionStatusLabel[current]}
				</span>
			</div>
			{reachable.map((next) => (
				<div key={next} className="flex items-center gap-3">
					<div className="flex flex-col items-center gap-1">
						<CaretRightIcon className="size-3.5 text-(--ink-3)" />
						<span className="text-[0.55rem] text-(--ink-3)">
							{transitionLabels[`${current}->${next}`]}
						</span>
					</div>
					<div className="flex flex-col items-center gap-1.5">
						<div className="size-8 rounded-full border border-(--ink-3)/40" />
						<span className="font-heading text-[0.6rem] text-(--ink-3)">
							{subscriptionStatusLabel[next]}
						</span>
					</div>
				</div>
			))}
		</div>
	);
}

function SubscriptionDetailPage() {
	const { subscriptionId } = Route.useParams();
	const [subscription, setSubscription] = useState<Subscription | undefined>(
		() => allSubscriptions.find((s) => s.id === subscriptionId),
	);

	const [cancelOpen, setCancelOpen] = useState(false);
	const [cancelMode, setCancelMode] = useState<"period_end" | "immediate">(
		"period_end",
	);
	const [cancelReason, setCancelReason] = useState("");
	const [pauseOpen, setPauseOpen] = useState(false);
	const [changePlanOpen, setChangePlanOpen] = useState(false);
	const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
	const [showFullDiagram, setShowFullDiagram] = useState(false);

	if (!subscription) {
		return (
			<div className="flex flex-1 items-center justify-center p-10">
				<Empty className="max-w-sm rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							Subscription not found
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							This subscription may have been removed or the link is incorrect.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild variant="outline" className="border-(--line)">
							<Link to="/subscriptions">Back to subscriptions</Link>
						</Button>
					</EmptyContent>
				</Empty>
			</div>
		);
	}

	const customer = customers.find(
		(c) => c.email === subscription.customerEmail,
	);
	const plan = plans.find((p) => p.id === subscription.planId);
	const isTerminal =
		subscription.status === "cancelled" || subscription.status === "expired";
	const isPastDue = subscription.status === "past_due";
	const dunning = isPastDue ? dunningAttemptsFor(subscription.id) : [];

	const periodStart = new Date(subscription.currentPeriodEnd);
	periodStart.setDate(periodStart.getDate() - 30);

	const subInvoices = allInvoices
		.filter((i) => i.subscriptionId === subscription.id)
		.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)
		.slice(0, 10);

	const alternativePlans = plans.filter(
		(p) => p.status === "published" && p.id !== subscription.planId,
	);
	const newPlan = plans.find((p) => p.id === selectedPlanId);
	const proration =
		newPlan && plan
			? calculateProration(
					plan.amountKobo,
					newPlan.amountKobo,
					subscription.currentPeriodEnd,
				)
			: null;

	function handleConfirmCancel() {
		setSubscription((prev) =>
			prev
				? {
						...prev,
						status: cancelMode === "immediate" ? "cancelled" : prev.status,
						cancelAtPeriodEnd:
							cancelMode === "period_end" ? true : prev.cancelAtPeriodEnd,
					}
				: prev,
		);
		setCancelOpen(false);
		setCancelReason("");
		toast.success(
			cancelMode === "immediate"
				? "Subscription cancelled"
				: "Cancellation scheduled",
		);
	}

	function handleConfirmPause() {
		setSubscription((prev) => (prev ? { ...prev, status: "paused" } : prev));
		setPauseOpen(false);
		toast.success("Subscription paused");
	}

	function handleResume() {
		setSubscription((prev) =>
			prev ? { ...prev, status: "active", cancelAtPeriodEnd: false } : prev,
		);
		toast.success("Subscription resumed");
	}

	function handleConfirmChangePlan() {
		if (!newPlan) return;
		setSubscription((prev) =>
			prev
				? { ...prev, planId: newPlan.id, amountKobo: newPlan.amountKobo }
				: prev,
		);
		setChangePlanOpen(false);
		setSelectedPlanId(null);
		toast.success("Plan changed");
	}

	return (
		<div className="p-6 pb-24 sm:pb-6">
			<div className="flex flex-col gap-4 border-b border-(--line) pb-6 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
							{subscription.customerName}
						</h1>
						<StatusBadge tone={subscriptionStatusTone[subscription.status]}>
							{subscriptionStatusLabel[subscription.status]}
						</StatusBadge>
					</div>
					<p className="text-sm text-(--ink-3)">{subscription.customerEmail}</p>
				</div>

				{!isTerminal && (
					<div className="hidden items-center gap-2 sm:flex">
						<Button
							variant="outline"
							onClick={() => setChangePlanOpen(true)}
							className="border-(--line)"
						>
							Change plan
						</Button>
						{subscription.status === "paused" ? (
							<Button
								onClick={handleResume}
								className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
							>
								Resume
							</Button>
						) : (
							<Button
								variant="outline"
								onClick={() => setPauseOpen(true)}
								className="border-(--line)"
							>
								Pause
							</Button>
						)}
						<Button
							variant="outline"
							onClick={() => setCancelOpen(true)}
							className="border-destructive/30 text-destructive hover:bg-destructive/10"
						>
							Cancel
						</Button>
					</div>
				)}
			</div>

			<div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
				<div>
					<p className="m-0 text-(--ink-3)">Plan</p>
					<p className="m-0 mt-0.5 font-medium text-(--ink)">
						{plan ? plan.name : "—"}
						{plan &&
							` · ${formatNGN(subscription.amountKobo)} / ${formatInterval(plan.interval).toLowerCase()}`}
					</p>
				</div>
				<div>
					<p className="m-0 text-(--ink-3)">Current period</p>
					<p className="m-0 mt-0.5 font-medium text-(--ink)">
						{formatDate(periodStart.toISOString())} →{" "}
						{formatDate(subscription.currentPeriodEnd)}
					</p>
				</div>
				<div>
					<p className="m-0 text-(--ink-3)">Next billing</p>
					<p className="m-0 mt-0.5 font-medium text-(--ink)">
						{formatRelativeBillingDate(subscription.nextBillingDate)}
					</p>
				</div>
				<div className="sm:col-span-2 lg:col-span-3">
					<p className="m-0 text-(--ink-3)">Payment method</p>
					<p className="m-0 mt-0.5 font-medium text-(--ink)">
						{customer?.cardBrand ?? "Card"} •••• {customer?.cardLast4 ?? "0000"}
						{customer?.cardExpiry && ` · Exp. ${customer.cardExpiry}`}
					</p>
				</div>
			</div>

			<Card className="mt-6 border border-(--line) bg-(--surface-1) shadow-none">
				<CardHeader>
					<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
						State
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="hidden overflow-x-auto md:block">
						<StateMachineDiagram current={subscription.status} />
					</div>
					<div className="flex flex-col gap-2 md:hidden">
						<p className="m-0 text-sm text-(--ink-2)">
							Currently{" "}
							<span className="font-medium text-(--ink)">
								{subscriptionStatusLabel[subscription.status]}
							</span>
							.
						</p>
						<button
							type="button"
							onClick={() => setShowFullDiagram(true)}
							className="text-sm font-medium text-(--brand) hover:underline"
						>
							See full state diagram
						</button>
					</div>
				</CardContent>
			</Card>

			{isPastDue && (
				<Card className="mt-6 border border-amber-500/20 bg-amber-500/5 shadow-none">
					<CardContent className="flex flex-col gap-4 pt-6">
						<div className="flex items-center gap-2">
							<WarningCircleIcon className="size-5 text-(--warning)" />
							<h2 className="m-0 text-base font-semibold text-(--ink)">
								Payment failed
							</h2>
						</div>
						<div className="grid gap-4 text-sm sm:grid-cols-2">
							<div>
								<p className="m-0 text-(--ink-3)">Next retry</p>
								<p className="m-0 mt-0.5 font-medium text-(--ink)">
									{subscription.nextRetryAt
										? formatRelativeBillingDate(subscription.nextRetryAt)
										: "—"}
								</p>
							</div>
							<div>
								<p className="m-0 text-(--ink-3)">Last failure reason</p>
								<p className="m-0 mt-0.5 font-medium text-(--ink)">
									{dunning[0]?.failureReason ?? "Unknown"}
								</p>
							</div>
						</div>
						<div>
							<p className="island-kicker m-0 mb-2">Attempt history</p>
							<div className="flex flex-col gap-3 border-l-2 border-(--line) pl-4">
								{dunning.map((attempt) => (
									<div key={attempt.attemptNumber}>
										<p className="m-0 text-sm text-(--ink)">
											Attempt {attempt.attemptNumber} ·{" "}
											{formatDateTime(attempt.timestamp)}
										</p>
										<div className="mt-1 flex items-center gap-2">
											<StatusBadge tone={dunningStatusTone[attempt.status]}>
												{dunningStatusLabel[attempt.status]}
											</StatusBadge>
											{attempt.failureReason && (
												<span className="text-xs text-(--ink-3)">
													{attempt.failureReason}
												</span>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<Card className="mt-6 border border-(--line) bg-(--surface-1) shadow-none">
				<CardHeader>
					<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
						Invoices
					</CardTitle>
				</CardHeader>
				<CardContent>
					{subInvoices.length === 0 ? (
						<p className="m-0 text-sm text-(--ink-3)">No invoices yet.</p>
					) : (
						<>
							<div className="hidden overflow-hidden rounded-md border border-(--line) md:block">
								<Table>
									<TableHeader>
										<TableRow className="border-(--line) hover:bg-transparent">
											<TableHead className="text-(--ink-3)">Invoice</TableHead>
											<TableHead className="text-(--ink-3)">Date</TableHead>
											<TableHead className="text-(--ink-3)">Amount</TableHead>
											<TableHead className="text-(--ink-3)">Status</TableHead>
											<TableHead className="text-(--ink-3)" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{subInvoices.map((invoice) => (
											<TableRow key={invoice.id} className="border-(--line)">
												<TableCell className="font-heading text-xs text-(--ink)">
													{invoice.number}
												</TableCell>
												<TableCell className="text-(--ink-3)">
													{formatDate(invoice.createdAt)}
												</TableCell>
												<TableCell className="text-(--ink-2)">
													{formatNGN(invoice.grossKobo)}
												</TableCell>
												<TableCell>
													<StatusBadge tone={invoiceStatusTone[invoice.status]}>
														{invoiceStatusLabel[invoice.status]}
													</StatusBadge>
												</TableCell>
												<TableCell>
													<Button
														asChild
														variant="ghost"
														size="sm"
														className="text-(--ink-3) hover:text-(--ink)"
													>
														<Link
															to="/invoices/$invoiceId"
															params={{ invoiceId: invoice.id }}
														>
															View
														</Link>
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
							<div className="flex flex-col gap-3 md:hidden">
								{subInvoices.map((invoice) => (
									<Link
										key={invoice.id}
										to="/invoices/$invoiceId"
										params={{ invoiceId: invoice.id }}
										className="block flex flex-col gap-1.5 rounded-md border border-(--line) p-3 no-underline"
									>
										<div className="flex items-center justify-between gap-2">
											<span className="font-heading text-xs text-(--ink)">
												{invoice.number}
											</span>
											<StatusBadge tone={invoiceStatusTone[invoice.status]}>
												{invoiceStatusLabel[invoice.status]}
											</StatusBadge>
										</div>
										<div className="text-sm text-(--ink-2)">
											{formatNGN(invoice.grossKobo)} ·{" "}
											{formatDate(invoice.createdAt)}
										</div>
									</Link>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{!isTerminal && (
				<div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-(--line) bg-(--surface-1) p-4 sm:hidden">
					<Button
						variant="outline"
						onClick={() => setCancelOpen(true)}
						className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
					>
						Cancel
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="icon-sm"
								className="border-(--line)"
							>
								<DotsThreeIcon className="size-5" weight="bold" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{subscription.status === "paused" ? (
								<DropdownMenuItem onClick={handleResume}>
									Resume
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem onClick={() => setPauseOpen(true)}>
									Pause
								</DropdownMenuItem>
							)}
							<DropdownMenuItem onClick={() => setChangePlanOpen(true)}>
								Change plan
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}

			<Dialog open={showFullDiagram} onOpenChange={setShowFullDiagram}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Subscription state</DialogTitle>
					</DialogHeader>
					<div className="overflow-x-auto py-2">
						<StateMachineDiagram current={subscription.status} />
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel subscription</DialogTitle>
						<DialogDescription>
							Choose when the cancellation takes effect.
						</DialogDescription>
					</DialogHeader>
					<RadioGroup
						value={cancelMode}
						onValueChange={(v) =>
							setCancelMode(v as "period_end" | "immediate")
						}
					>
						<FieldLabel htmlFor="cancel-period-end">
							<Field
								orientation="horizontal"
								className="rounded-md border border-(--line) bg-(--surface) p-3"
							>
								<RadioGroupItem value="period_end" id="cancel-period-end" />
								<FieldContent>
									<span className="text-sm font-medium text-(--ink)">
										Cancel at period end
									</span>
									<span className="text-xs text-(--ink-3)">Recommended.</span>
								</FieldContent>
							</Field>
						</FieldLabel>
						<FieldLabel htmlFor="cancel-immediate">
							<Field
								orientation="horizontal"
								className="rounded-md border border-(--line) bg-(--surface) p-3"
							>
								<RadioGroupItem value="immediate" id="cancel-immediate" />
								<FieldContent>
									<span className="text-sm font-medium text-(--ink)">
										Cancel immediately
									</span>
									<span className="text-xs text-(--ink-3)">
										The subscriber loses access now.
									</span>
								</FieldContent>
							</Field>
						</FieldLabel>
					</RadioGroup>
					<div className="flex flex-col gap-1.5">
						<p className="text-sm font-medium text-(--ink-2)">
							Reason{" "}
							<span className="font-normal text-(--ink-3)">(optional)</span>
						</p>
						<Textarea
							value={cancelReason}
							onChange={(e) => setCancelReason(e.target.value)}
							rows={3}
							className="rounded-md border-(--line) bg-(--surface) px-3 py-2"
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCancelOpen(false)}
							className="border-(--line)"
						>
							Keep subscription
						</Button>
						<Button variant="destructive" onClick={handleConfirmCancel}>
							Confirm cancellation
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Pause subscription</DialogTitle>
						<DialogDescription>
							Pausing stops billing. The subscriber keeps access until their
							period ends. Billing resumes when you manually resume.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setPauseOpen(false)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							onClick={handleConfirmPause}
							className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							Pause subscription
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Sheet
				open={changePlanOpen}
				onOpenChange={(open) => {
					setChangePlanOpen(open);
					if (!open) setSelectedPlanId(null);
				}}
			>
				<SheetContent
					side="right"
					className="w-full border-(--line) bg-(--surface-1) sm:max-w-120"
				>
					<SheetHeader className="pb-4">
						<SheetTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							Change plan
						</SheetTitle>
					</SheetHeader>
					<div className="flex flex-col gap-4 px-8 pb-8">
						{!newPlan ? (
							<div className="flex flex-col gap-3">
								{alternativePlans.map((p) => (
									<Card
										key={p.id}
										className="border border-(--line) bg-(--surface) shadow-none"
									>
										<CardContent className="flex items-center justify-between gap-3 py-4">
											<div>
												<span className="font-medium text-(--ink)">
													{p.name}
												</span>
												<p className="mt-1 text-sm text-(--ink-2)">
													{formatNGN(p.amountKobo)} /{" "}
													{formatInterval(p.interval).toLowerCase()}
												</p>
											</div>
											<Button
												variant="outline"
												onClick={() => setSelectedPlanId(p.id)}
												className="border-(--line)"
											>
												Select
											</Button>
										</CardContent>
									</Card>
								))}
							</div>
						) : (
							<div className="flex flex-col gap-4">
								<Card className="border border-(--line) bg-(--surface) shadow-none">
									<CardContent className="flex flex-col gap-1 py-4">
										<p className="island-kicker m-0">Switching to</p>
										<p className="text-lg font-semibold text-(--ink)">
											{newPlan.name}
										</p>
										<p className="m-0 text-sm text-(--ink-2)">
											{formatNGN(newPlan.amountKobo)} /{" "}
											{formatInterval(newPlan.interval).toLowerCase()}
										</p>
									</CardContent>
								</Card>
								<Card className="border border-(--line) bg-(--surface) shadow-none">
									<CardContent className="flex flex-col gap-2 py-4 text-sm">
										<p className="island-kicker m-0">Proration</p>
										<p className="m-0 text-(--ink-2)">
											{proration && proration.chargeKobo > 0
												? `Charge ${formatNGN(proration.chargeKobo)} today.`
												: proration && proration.creditKobo > 0
													? `Credit ${formatNGN(proration.creditKobo)} on next invoice.`
													: "No additional charge or credit."}
										</p>
										<p className="m-0 text-(--ink-3)">
											Effective {formatDate(new Date().toISOString())}
										</p>
									</CardContent>
								</Card>
								<div className="flex flex-col gap-3">
									<Button
										onClick={handleConfirmChangePlan}
										className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
									>
										Confirm change
									</Button>
									<button
										type="button"
										onClick={() => setSelectedPlanId(null)}
										className="text-center text-sm font-medium text-(--brand) hover:underline"
									>
										Back
									</button>
								</div>
							</div>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
