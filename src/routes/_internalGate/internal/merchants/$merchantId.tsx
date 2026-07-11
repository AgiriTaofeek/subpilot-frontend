import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
	RouteErrorFallback,
	SessionExpiredFallback,
} from "#/components/layout/route-error-fallback.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent } from "#/components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import { Field, FieldLabel } from "#/components/ui/field.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { internalMerchantAnalyticsQueryOptions } from "#/data/internal-analytics.ts";
import {
	internalMerchantDetailQueryOptions,
	internalMerchantFeesQueryOptions,
	merchantStatusLabel,
	merchantStatusTone,
} from "#/data/internal-merchants.ts";
import { useHandleMutationError } from "#/hooks/use-handle-mutation-error.ts";
import { classifyError } from "#/lib/api/classify-error.ts";
import {
	removeInternalMerchantFeeOverride,
	setInternalMerchantFeeOverride,
	updateInternalMerchantStatus,
} from "#/lib/api/internal-merchants.ts";
import { isSessionError } from "#/lib/api/is-session-error.ts";
import { formatNGN } from "#/lib/currency.ts";
import type { MerchantStatusDto } from "#/types/api.ts";

const internalGateRouteApi = getRouteApi("/_internalGate");

export const Route = createFileRoute(
	"/_internalGate/internal/merchants/$merchantId",
)({
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				internalMerchantDetailQueryOptions(params.merchantId),
			),
			context.queryClient.ensureQueryData(
				internalMerchantFeesQueryOptions(params.merchantId),
			),
		]);
	},
	component: InternalMerchantDetailPage,
	errorComponent: InternalMerchantDetailErrorFallback,
	head: () => ({ meta: [{ title: "Merchant | SubPilot Internal" }] }),
});

function InternalMerchantDetailErrorFallback({
	error,
	reset,
}: {
	error: Error;
	reset: () => void;
}) {
	if (isSessionError(error.message)) {
		return <SessionExpiredFallback />;
	}

	if (classifyError(error.message) === "not_found") {
		return (
			<RouteErrorFallback
				title="Merchant not found"
				description="This merchant may have been removed."
				action={
					<Button asChild variant="outline" className="border-(--line)">
						<Link to="/internal/merchants">Back to merchants</Link>
					</Button>
				}
			/>
		);
	}

	return (
		<RouteErrorFallback
			title="Something went wrong"
			description="We couldn't load this merchant. Try again in a moment."
			action={
				<Button variant="outline" onClick={reset} className="border-(--line)">
					Try again
				</Button>
			}
		/>
	);
}

const STATUS_OPTIONS: MerchantStatusDto[] = [
	"active",
	"under_review",
	"suspended",
];

// A deliberately separate, non-suspense query from the rest of this page:
// GET /v1/internal/analytics/merchants/{id} 404s whenever a merchant has no
// fee-ledger activity in the window (a brand-new merchant, or one with no
// revenue in the last 30 days) — that's a routine, expected state here, not
// "this merchant doesn't exist" the way a 404 on the merchant-detail fetch
// itself would be. Wiring it into the same useSuspenseQuery/errorComponent
// as the rest of the page would incorrectly show "Merchant not found" for
// the whole page over a merchant that's very much still there.
function MerchantRevenuePanel({ merchantId }: { merchantId: string }) {
	const { data, error, isPending } = useQuery(
		internalMerchantAnalyticsQueryOptions(merchantId),
	);

	if (isPending) {
		return (
			<div className="grid gap-4 pt-4 sm:grid-cols-3">
				{["gross", "net", "transactions"].map((placeholder) => (
					<Card
						key={placeholder}
						className="border border-(--line) bg-(--surface-1) shadow-none"
					>
						<CardContent className="py-4">
							<div className="h-3 w-20 animate-pulse rounded bg-(--surface-2)" />
							<div className="mt-2 h-5 w-24 animate-pulse rounded bg-(--surface-2)" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (error) {
		if (classifyError(error.message) === "not_found") {
			return (
				<p className="pt-4 text-sm text-(--ink-3)">
					No revenue from this merchant in the last 30 days.
				</p>
			);
		}
		return (
			<p className="pt-4 text-sm text-(--ink-3)">
				Couldn't load revenue for this merchant.
			</p>
		);
	}

	return (
		<div className="grid gap-4 pt-4 sm:grid-cols-3">
			<Card className="border border-(--line) bg-(--surface-1) shadow-none">
				<CardContent className="py-4">
					<p className="island-kicker m-0">Gross · last 30 days</p>
					<p className="mt-1 text-lg font-semibold text-(--ink)">
						{formatNGN(data.grossAmountMinor)}
					</p>
				</CardContent>
			</Card>
			<Card className="border border-(--line) bg-(--surface-1) shadow-none">
				<CardContent className="py-4">
					<p className="island-kicker m-0">Net · last 30 days</p>
					<p className="mt-1 text-lg font-semibold text-(--ink)">
						{formatNGN(data.netAmountMinor)}
					</p>
				</CardContent>
			</Card>
			<Card className="border border-(--line) bg-(--surface-1) shadow-none">
				<CardContent className="py-4">
					<p className="island-kicker m-0">Transactions · last 30 days</p>
					<p className="mt-1 text-lg font-semibold text-(--ink)">
						{data.transactionCount.toLocaleString()}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

function InternalMerchantDetailPage() {
	const { merchantId } = Route.useParams();
	const { internalAdminSession } = internalGateRouteApi.useRouteContext();
	const queryClient = useQueryClient();
	const handleMutationError = useHandleMutationError();
	const isSuperAdmin = internalAdminSession.role === "super_admin";

	const { data: merchant } = useSuspenseQuery(
		internalMerchantDetailQueryOptions(merchantId),
	);
	const { data: fees } = useSuspenseQuery(
		internalMerchantFeesQueryOptions(merchantId),
	);

	const [statusOpen, setStatusOpen] = useState(false);
	const [nextStatus, setNextStatus] = useState<MerchantStatusDto>(
		merchant.status,
	);
	const [statusReason, setStatusReason] = useState("");

	const [overrideOpen, setOverrideOpen] = useState(false);
	const [overrideFeeBps, setOverrideFeeBps] = useState(
		fees.overrideFeeBps ?? fees.platformDefaultFeeBps,
	);
	const [overrideFixedFeeMinor, setOverrideFixedFeeMinor] = useState(
		fees.overrideFixedFeeMinor ?? fees.platformDefaultFixedFeeMinor,
	);
	const [overrideReason, setOverrideReason] = useState("");

	const [removeOverrideOpen, setRemoveOverrideOpen] = useState(false);
	const [removeReason, setRemoveReason] = useState("");

	function invalidateMerchant() {
		return Promise.all([
			queryClient.invalidateQueries({
				queryKey: internalMerchantDetailQueryOptions(merchantId).queryKey,
			}),
			queryClient.invalidateQueries({
				queryKey: internalMerchantFeesQueryOptions(merchantId).queryKey,
			}),
			queryClient.invalidateQueries({ queryKey: ["internal-merchants"] }),
		]);
	}

	const statusMutation = useMutation({
		mutationFn: () =>
			updateInternalMerchantStatus({
				data: { merchantId, status: nextStatus, reason: statusReason },
			}),
		onSuccess: async () => {
			await invalidateMerchant();
			setStatusOpen(false);
			setStatusReason("");
			toast.success("Merchant status updated");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't update merchant status.",
			}),
	});

	const overrideMutation = useMutation({
		mutationFn: () =>
			setInternalMerchantFeeOverride({
				data: {
					merchantId,
					overrideFeeBps,
					overrideFixedFeeMinor,
					reason: overrideReason,
				},
			}),
		onSuccess: async () => {
			await invalidateMerchant();
			setOverrideOpen(false);
			setOverrideReason("");
			toast.success("Fee override saved");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't save the fee override.",
			}),
	});

	const removeOverrideMutation = useMutation({
		mutationFn: () =>
			removeInternalMerchantFeeOverride({
				data: { merchantId, reason: removeReason },
			}),
		onSuccess: async () => {
			await invalidateMerchant();
			setRemoveOverrideOpen(false);
			setRemoveReason("");
			toast.success("Fee override removed");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't remove the fee override.",
			}),
	});

	return (
		<div className="p-6">
			<div className="flex flex-col gap-4 border-b border-(--line) pb-6 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="font-heading text-xl text-(--ink)">
							{merchant.businessName}
						</h1>
						<StatusBadge tone={merchantStatusTone[merchant.status]}>
							{merchantStatusLabel[merchant.status]}
						</StatusBadge>
					</div>
					<p className="mt-1 text-sm text-(--ink-3)">
						{merchant.email} · {merchant.slug}
					</p>
				</div>

				<Button
					variant="outline"
					onClick={() => {
						setNextStatus(merchant.status);
						setStatusOpen(true);
					}}
					className="border-(--line)"
				>
					Change status
				</Button>
			</div>

			<div className="grid gap-4 pt-6 sm:grid-cols-3">
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Effective fee</p>
						<p className="mt-1 text-lg font-semibold text-(--ink)">
							{(fees.effectiveFeeBps / 100).toFixed(2)}%
						</p>
						<p className="mt-0.5 text-xs text-(--ink-3)">
							+ {fees.effectiveFixedFeeMinor} kobo fixed
						</p>
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="py-4">
						<p className="island-kicker m-0">Fee source</p>
						<p className="mt-1 text-lg font-semibold text-(--ink)">
							{fees.overrideFeeBps !== null ? "Override" : "Platform default"}
						</p>
					</CardContent>
				</Card>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="flex items-center justify-between gap-2 py-4">
						{isSuperAdmin ? (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setOverrideFeeBps(
											fees.overrideFeeBps ?? fees.platformDefaultFeeBps,
										);
										setOverrideFixedFeeMinor(
											fees.overrideFixedFeeMinor ??
												fees.platformDefaultFixedFeeMinor,
										);
										setOverrideOpen(true);
									}}
									className="border-(--line)"
								>
									Set override
								</Button>
								{fees.overrideFeeBps !== null && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setRemoveOverrideOpen(true)}
										className="text-destructive hover:bg-destructive/10"
									>
										Remove
									</Button>
								)}
							</>
						) : (
							<p className="m-0 text-xs text-(--ink-3)">
								Only super admins can change fee overrides.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			<MerchantRevenuePanel merchantId={merchantId} />

			<Dialog open={statusOpen} onOpenChange={setStatusOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change merchant status</DialogTitle>
						<DialogDescription>
							This is recorded in the internal audit log with the reason below.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<Field>
							<FieldLabel htmlFor="next-status">New status</FieldLabel>
							<Select
								value={nextStatus}
								onValueChange={(value) =>
									setNextStatus(value as MerchantStatusDto)
								}
							>
								<SelectTrigger
									id="next-status"
									className="border-(--line) bg-(--surface) px-3"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STATUS_OPTIONS.map((status) => (
										<SelectItem key={status} value={status}>
											{merchantStatusLabel[status]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="status-reason">Reason</FieldLabel>
							<Textarea
								id="status-reason"
								value={statusReason}
								onChange={(e) => setStatusReason(e.target.value)}
								placeholder="Why is this status changing?"
								className="border-(--line) bg-(--surface)"
							/>
						</Field>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setStatusOpen(false)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							onClick={() => statusMutation.mutate()}
							disabled={
								statusMutation.isPending ||
								statusReason.trim().length === 0 ||
								nextStatus === merchant.status
							}
						>
							{statusMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Saving…
								</>
							) : (
								"Save"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Set fee override</DialogTitle>
						<DialogDescription>
							Overrides the platform default of{" "}
							{(fees.platformDefaultFeeBps / 100).toFixed(2)}% +{" "}
							{fees.platformDefaultFixedFeeMinor} kobo for this merchant only.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<Field>
							<FieldLabel htmlFor="override-bps">Fee (basis points)</FieldLabel>
							<input
								id="override-bps"
								type="number"
								min={0}
								value={overrideFeeBps}
								onChange={(e) => setOverrideFeeBps(Number(e.target.value))}
								className="h-9 rounded-md border border-(--line) bg-(--surface) px-3 text-sm"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="override-fixed">Fixed fee (kobo)</FieldLabel>
							<input
								id="override-fixed"
								type="number"
								min={0}
								value={overrideFixedFeeMinor}
								onChange={(e) =>
									setOverrideFixedFeeMinor(Number(e.target.value))
								}
								className="h-9 rounded-md border border-(--line) bg-(--surface) px-3 text-sm"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="override-reason">Reason</FieldLabel>
							<Textarea
								id="override-reason"
								value={overrideReason}
								onChange={(e) => setOverrideReason(e.target.value)}
								placeholder="Why does this merchant need a different rate?"
								className="border-(--line) bg-(--surface)"
							/>
						</Field>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setOverrideOpen(false)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							onClick={() => overrideMutation.mutate()}
							disabled={
								overrideMutation.isPending || overrideReason.trim().length === 0
							}
						>
							{overrideMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Saving…
								</>
							) : (
								"Save override"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={removeOverrideOpen} onOpenChange={setRemoveOverrideOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove fee override?</DialogTitle>
						<DialogDescription>
							This merchant will revert to the platform default fee.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel htmlFor="remove-reason">Reason</FieldLabel>
						<Textarea
							id="remove-reason"
							value={removeReason}
							onChange={(e) => setRemoveReason(e.target.value)}
							placeholder="Why is the override being removed?"
							className="border-(--line) bg-(--surface)"
						/>
					</Field>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRemoveOverrideOpen(false)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => removeOverrideMutation.mutate()}
							disabled={
								removeOverrideMutation.isPending ||
								removeReason.trim().length === 0
							}
						>
							{removeOverrideMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Removing…
								</>
							) : (
								"Remove override"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
