import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import { customerDetailQueryOptions } from "#/data/customers.ts";
import {
	formatRelativeBillingDate,
	subscriptionStatusLabel,
	subscriptionStatusTone,
} from "#/data/subscriptions.ts";
import { formatNGN } from "#/lib/currency.ts";

export const Route = createFileRoute("/_dashboard/customers/$customerId")({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			customerDetailQueryOptions(params.customerId),
		);
	},
	component: CustomerDetailPage,
	head: () => ({ meta: [{ title: "Customer | SubPilot" }] }),
});

function CustomerDetailPage() {
	const { customerId } = Route.useParams();
	const navigate = useNavigate();
	const { data } = useSuspenseQuery(customerDetailQueryOptions(customerId));
	const { customer, subscriptions: subs } = data;
	const pastDueCount = subs.filter((s) => s.status === "past_due").length;

	function goToSubscription(subscriptionId: string) {
		navigate({
			to: "/subscriptions/$subscriptionId",
			params: { subscriptionId },
		});
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="flex flex-col gap-2 pt-6">
						<div className="flex flex-wrap items-center gap-3">
							<h1 className="text-xl font-bold text-(--ink)">
								{customer.name}
							</h1>
							{pastDueCount > 0 && (
								<a href="#subscriptions-list">
									<StatusBadge tone="warning">
										{pastDueCount} past due
									</StatusBadge>
								</a>
							)}
						</div>
						<p className="m-0 text-(--ink-3)">{customer.email}</p>
						{customer.phone && (
							<p className="m-0 text-(--ink-3)">{customer.phone}</p>
						)}
					</CardContent>
				</Card>

				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardHeader>
						<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
							Payment method
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="m-0 text-(--ink)">
							{customer.cardBrand} •••• {customer.cardLast4}
						</p>
						<p className="mt-1 text-sm text-(--ink-3)">
							Exp. {customer.cardExpiry}
						</p>
					</CardContent>
				</Card>
			</div>

			<Card
				id="subscriptions-list"
				className="scroll-mt-6 border border-(--line) bg-(--surface-1) shadow-none"
			>
				<CardHeader>
					<CardTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
						Subscriptions
					</CardTitle>
				</CardHeader>
				<CardContent>
					{subs.length === 0 ? (
						<p className="text-sm text-(--ink-3)">
							No subscriptions linked to this customer.
						</p>
					) : (
						<>
							{/* Desktop table */}
							<div className="hidden overflow-hidden rounded-md border border-(--line) md:block">
								<Table>
									<TableHeader>
										<TableRow className="border-(--line) hover:bg-transparent">
											<TableHead className="text-(--ink-3)">Plan</TableHead>
											<TableHead className="text-(--ink-3)">Status</TableHead>
											<TableHead className="text-(--ink-3)">
												Next billing
											</TableHead>
											<TableHead className="text-(--ink-3)">Amount</TableHead>
											<TableHead className="text-(--ink-3)" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{subs.map((sub) => (
											<TableRow
												key={sub.id}
												onClick={() => goToSubscription(sub.id)}
												className="cursor-pointer border-(--line) hover:bg-(--surface-2)"
											>
												<TableCell className="text-(--ink)">
													{sub.planName}
												</TableCell>
												<TableCell>
													<StatusBadge
														tone={subscriptionStatusTone[sub.status]}
													>
														{subscriptionStatusLabel[sub.status]}
													</StatusBadge>
												</TableCell>
												<TableCell className="text-(--ink-2)">
													{formatRelativeBillingDate(sub.nextBillingDate)}
												</TableCell>
												<TableCell className="text-(--ink-2)">
													{formatNGN(sub.amountKobo)}
												</TableCell>
												<TableCell>
													<Button
														variant="ghost"
														size="sm"
														onClick={(e) => {
															e.stopPropagation();
															goToSubscription(sub.id);
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
								{subs.map((sub) => (
									<div
										key={sub.id}
										className="relative flex flex-col gap-1.5 rounded-md border border-(--line) p-3"
									>
										<button
											type="button"
											onClick={() => goToSubscription(sub.id)}
											aria-label={`View ${sub.planName} subscription`}
											className="absolute inset-0 z-0 rounded-md"
										/>
										<div className="relative z-10 flex items-center justify-between gap-2">
											<span className="font-medium text-(--ink)">
												{sub.planName}
											</span>
											<StatusBadge tone={subscriptionStatusTone[sub.status]}>
												{subscriptionStatusLabel[sub.status]}
											</StatusBadge>
										</div>
										<div className="relative z-10 text-sm text-(--ink-2)">
											{formatNGN(sub.amountKobo)} · Next:{" "}
											{formatRelativeBillingDate(sub.nextBillingDate)}
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<Card className="border border-(--line) bg-(--surface-1) shadow-none">
				<CardHeader>
					<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
						Recent invoices
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<p className="text-sm text-(--ink-3)">No invoices yet.</p>

					<Link
						to="/invoices"
						search={{ q: customer.email }}
						className="inline-block text-sm font-medium text-(--brand) hover:underline"
					>
						View all invoices
					</Link>
				</CardContent>
			</Card>
		</div>
	);
}
