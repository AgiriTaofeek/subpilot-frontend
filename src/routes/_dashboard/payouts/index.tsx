import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
	RouteErrorFallback,
	SessionExpiredFallback,
} from "#/components/layout/route-error-fallback.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent, CardHeader } from "#/components/ui/card.tsx";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxTrigger,
	ComboboxValue,
} from "#/components/ui/combobox.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
import { Field, FieldError, FieldLabel } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { PageSizeSelect } from "#/components/ui/page-size-select.tsx";
import { ListPageSkeleton } from "#/components/ui/page-skeleton.tsx";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "#/components/ui/pagination.tsx";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
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
	disbursementsQueryOptions,
	PAYOUTS_PAGE_SIZE,
	payoutAccountQueryOptions,
	payoutBanksQueryOptions,
} from "#/data/payouts.ts";
import { useHandleMutationError } from "#/hooks/use-handle-mutation-error.ts";
import { getBackendErrorDetails } from "#/lib/api/classify-error.ts";
import { isSessionError } from "#/lib/api/is-session-error.ts";
import {
	lookupPayoutAccount,
	savePayoutAccount,
	triggerDisbursement,
} from "#/lib/api/payouts.ts";
import { formatNGN } from "#/lib/currency.ts";
import { formatDate } from "#/lib/date.ts";
import { pageSizeSchema } from "#/lib/pagination-sizes.ts";
import type { DisbursementStatusDto, PayoutBankDto } from "#/types/api.ts";

const defaultPayoutsSearch = { page: 1, size: PAYOUTS_PAGE_SIZE };

const payoutsSearchSchema = z.object({
	page: z.number().default(defaultPayoutsSearch.page),
	size: pageSizeSchema(defaultPayoutsSearch.size),
});

export const Route = createFileRoute("/_dashboard/payouts/")({
	validateSearch: payoutsSearchSchema,
	search: {
		middlewares: [stripSearchParams(defaultPayoutsSearch)],
	},
	loaderDeps: ({ search }) => ({ page: search.page, size: search.size }),
	loader: async ({ context, deps }) => {
		// Disbursements: not awaited — see events.tsx for why. Banks and the
		// saved payout account: still awaited, small reference data for the
		// bank-account sheet, not the paginated resource.
		void context.queryClient.prefetchQuery(
			disbursementsQueryOptions(deps.page, deps.size),
		);
		await Promise.all([
			context.queryClient.ensureQueryData(payoutBanksQueryOptions()),
			context.queryClient.ensureQueryData(payoutAccountQueryOptions()),
		]);
	},
	component: PayoutsPage,
	pendingComponent: () => <ListPageSkeleton columns={5} />,
	errorComponent: PayoutsErrorFallback,
	head: () => ({ meta: [{ title: "Payouts | SubPilot" }] }),
});

function PayoutsErrorFallback({
	error,
	reset,
}: {
	error: Error;
	reset: () => void;
}) {
	if (isSessionError(error.message)) {
		return <SessionExpiredFallback />;
	}

	return (
		<RouteErrorFallback
			title="Something went wrong"
			description="We couldn't load payouts. Try again in a moment."
			action={
				<Button variant="outline" onClick={reset} className="border-(--line)">
					Try again
				</Button>
			}
		/>
	);
}

const disbursementStatusTone: Record<
	DisbursementStatusDto,
	"success" | "warning" | "danger"
> = {
	succeeded: "success",
	pending: "warning",
	failed: "danger",
};

const disbursementStatusLabel: Record<DisbursementStatusDto, string> = {
	succeeded: "Succeeded",
	pending: "Pending",
	failed: "Failed",
};

// Fallback for triggering a payout with no account on file. GET
// /v1/merchants/me/payout-account (payoutAccountQueryOptions, used below to
// pre-fill the bank sheet) covers the proactive case, but this string match
// stays as a safety net for the trigger call itself — see
// DisbursementService.trigger() on the backend for the message it throws.
const PAYOUT_ACCOUNT_NOT_CONFIGURED_MESSAGE =
	"no payout bank account configured";

function formatPeriod(startIso: string | null, endIso: string): string {
	if (!startIso) return `Through ${formatDate(endIso)}`;
	return `${formatDate(startIso)} – ${formatDate(endIso)}`;
}

function BankAccountSheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: banks } = useSuspenseQuery(payoutBanksQueryOptions());
	const { data: payoutAccount } = useSuspenseQuery(payoutAccountQueryOptions());
	const sortedBanks = useMemo(
		() => [...banks].sort((a, b) => a.name.localeCompare(b.name)),
		[banks],
	);
	// Seeded from payoutAccount when the sheet opens (see the Sheet's
	// onOpenChange below) rather than as useState initializers, since this
	// component stays mounted the whole time — a useState initializer would
	// only ever run once and go stale after a save.
	const [bankCode, setBankCode] = useState("");
	const [bankPickerOpen, setBankPickerOpen] = useState(false);
	const [accountNumber, setAccountNumber] = useState("");
	const [verifiedName, setVerifiedName] = useState<string | null>(null);
	const [verifyError, setVerifyError] = useState<string | null>(null);
	const handleMutationError = useHandleMutationError();
	const queryClient = useQueryClient();

	function resetVerification() {
		setVerifiedName(null);
		setVerifyError(null);
	}

	const verifyMutation = useMutation({
		mutationFn: () =>
			lookupPayoutAccount({ data: { accountNumber, bankCode } }),
		onSuccess: (result) => {
			if (result.found && result.accountName) {
				setVerifiedName(result.accountName);
				setVerifyError(null);
			} else {
				setVerifiedName(null);
				setVerifyError(
					result.failureReason ?? "Could not verify this account.",
				);
			}
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't verify this account.",
			}),
	});

	const saveMutation = useMutation({
		mutationFn: () => savePayoutAccount({ data: { accountNumber, bankCode } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: payoutAccountQueryOptions().queryKey,
			});
			toast.success("Payout bank account saved");
			onOpenChange(false);
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't save the bank account.",
			}),
	});

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (next) {
					// Pre-fill from the saved account, if one exists, instead of
					// always starting blank.
					setBankCode(payoutAccount.bankCode ?? "");
					setAccountNumber(payoutAccount.accountNumber ?? "");
					setVerifiedName(
						payoutAccount.found ? payoutAccount.accountName : null,
					);
					setVerifyError(null);
				} else {
					setBankCode("");
					setAccountNumber("");
					resetVerification();
				}
			}}
			modal={false}
		>
			<SheetContent
				side="right"
				className="w-88 border-(--line) bg-(--surface-1)"
				onEscapeKeyDown={(event) => {
					if (bankPickerOpen) event.preventDefault();
				}}
			>
				<SheetHeader className="pb-4">
					<SheetTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
						Payout bank account
					</SheetTitle>
					<SheetDescription className="text-(--ink-3)">
						Verify your account before saving — payouts are sent here.
					</SheetDescription>
				</SheetHeader>
				<div className="flex flex-col gap-4 px-8 pb-8">
					<Field>
						<FieldLabel
							htmlFor="bankCode"
							className="text-sm font-medium text-(--ink-2)"
						>
							Bank
						</FieldLabel>
						<Combobox<PayoutBankDto>
							items={sortedBanks}
							value={
								sortedBanks.find((bank) => bank.bankCode === bankCode) ?? null
							}
							onValueChange={(bank) => {
								setBankCode(bank?.bankCode ?? "");
								resetVerification();
							}}
							onOpenChange={setBankPickerOpen}
							itemToStringValue={(bank) => bank.name}
							itemToStringLabel={(bank) => bank.name}
						>
							<ComboboxTrigger
								id="bankCode"
								render={
									<Button
										variant="outline"
										className="w-full justify-between rounded-md border-(--line) bg-(--surface) px-3 font-normal"
									/>
								}
							>
								<ComboboxValue placeholder="Select your bank" />
							</ComboboxTrigger>
							<ComboboxContent>
								<ComboboxInput
									showTrigger={false}
									placeholder="Search banks…"
								/>
								<ComboboxEmpty>No bank found.</ComboboxEmpty>
								<ComboboxList>
									{(bank: PayoutBankDto) => (
										<ComboboxItem key={bank.bankCode} value={bank}>
											{bank.name}
										</ComboboxItem>
									)}
								</ComboboxList>
							</ComboboxContent>
						</Combobox>
					</Field>

					<Field data-invalid={verifyError !== null}>
						<FieldLabel
							htmlFor="accountNumber"
							className="text-sm font-medium text-(--ink-2)"
						>
							Account number
						</FieldLabel>
						<Input
							id="accountNumber"
							value={accountNumber}
							onChange={(e) => {
								setAccountNumber(e.target.value);
								resetVerification();
							}}
							placeholder="0123456789"
							aria-invalid={verifyError !== null}
							className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
						/>
						<FieldError
							className="text-xs"
							errors={verifyError ? [{ message: verifyError }] : undefined}
						/>
					</Field>

					{verifiedName && (
						<div className="rounded-md border border-(--success)/20 bg-(--success)/10 px-3 py-2 text-sm text-(--ink)">
							Verified: <span className="font-medium">{verifiedName}</span>
						</div>
					)}

					<Button
						variant="outline"
						onClick={() => verifyMutation.mutate()}
						disabled={
							!bankCode || !accountNumber.trim() || verifyMutation.isPending
						}
						className="border-(--line)"
					>
						{verifyMutation.isPending ? (
							<>
								<Spinner data-icon="inline-start" />
								Verifying…
							</>
						) : (
							"Verify account"
						)}
					</Button>
				</div>
				<SheetFooter>
					<Button
						onClick={() => saveMutation.mutate()}
						disabled={!verifiedName || saveMutation.isPending}
						className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
					>
						{saveMutation.isPending ? (
							<>
								<Spinner data-icon="inline-start" />
								Saving…
							</>
						) : (
							"Save bank account"
						)}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function PayoutsPage() {
	const { page, size } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: payoutsPage, isPlaceholderData } = useQuery(
		disbursementsQueryOptions(page, size),
	);
	const [bankSheetOpen, setBankSheetOpen] = useState(false);
	const [triggerConfirmOpen, setTriggerConfirmOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const queryClient = useQueryClient();
	const handleMutationError = useHandleMutationError();

	function handleSizeChange(nextSize: number) {
		navigate({
			search: (prev) => ({ ...prev, size: nextSize, page: 1 }),
			resetScroll: false,
		});
	}

	const triggerMutation = useMutation({
		mutationFn: () => triggerDisbursement(),
		onSuccess: async (created) => {
			await queryClient.invalidateQueries({ queryKey: ["payouts"] });
			setTriggerConfirmOpen(false);
			if (created.status === "failed") {
				toast.error(created.failureReason ?? "Payout could not be completed.");
			} else {
				toast.success("Payout triggered");
			}
		},
		onError: (error) => {
			setTriggerConfirmOpen(false);
			const message = error instanceof Error ? error.message : String(error);
			const { displayMessage } = getBackendErrorDetails(message);
			if (displayMessage.includes(PAYOUT_ACCOUNT_NOT_CONFIGURED_MESSAGE)) {
				toast.error("Set up your payout bank account first.");
				setBankSheetOpen(true);
				return;
			}
			handleMutationError(error, {
				fallbackMessage: "Couldn't trigger the payout.",
			});
		},
	});

	if (!payoutsPage) {
		return <ListPageSkeleton columns={5} />;
	}

	const disbursements = payoutsPage.content;
	const pageCount = Math.max(1, payoutsPage.totalPages);
	const hasAnyPayouts = disbursements.length > 0;
	const selectedPayout = disbursements.find((d) => d.id === selectedId) ?? null;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
						Payouts
					</h1>
					<p className="mt-1 max-w-lg text-sm text-(--ink-3)">
						Move your available balance to your bank account. Payouts include
						every invoice paid since your last successful payout.
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => setBankSheetOpen(true)}
						className="border-(--line)"
					>
						Bank account
					</Button>
					<Button
						onClick={() => setTriggerConfirmOpen(true)}
						className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
					>
						Trigger payout
					</Button>
				</div>
			</div>

			<Card className="border border-(--line) bg-(--surface-1) shadow-none">
				<CardHeader className="pb-0">
					<p className="island-kicker m-0">How payouts work</p>
				</CardHeader>
				<CardContent className="flex flex-col gap-1 pt-2 text-sm text-(--ink-2)">
					<p className="m-0">
						Triggering a payout batches every unpaid-out invoice into one
						transfer to your saved bank account.
					</p>
					<p className="m-0">
						Only one payout can be in progress at a time — wait for a pending
						payout to resolve before triggering another.
					</p>
				</CardContent>
			</Card>

			{!hasAnyPayouts ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No payouts yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Set up your bank account, then trigger your first payout once you
							have invoices paid.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button
							variant="outline"
							onClick={() => setBankSheetOpen(true)}
							className="border-(--line)"
						>
							Set up bank account
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<div
					className={
						isPlaceholderData
							? "flex flex-col gap-6 opacity-50 transition-opacity"
							: "flex flex-col gap-6"
					}
				>
					{/* Desktop table */}
					<div className="hidden overflow-hidden rounded-2xl border border-(--line) bg-(--surface-1) md:block">
						<Table>
							<TableHeader>
								<TableRow className="border-(--line) hover:bg-transparent">
									<TableHead className="text-(--ink-3)">Amount</TableHead>
									<TableHead className="text-(--ink-3)">Status</TableHead>
									<TableHead className="text-(--ink-3)">Period</TableHead>
									<TableHead className="text-(--ink-3)">Invoices</TableHead>
									<TableHead className="text-(--ink-3)">Created</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{disbursements.map((d) => (
									<TableRow
										key={d.id}
										onClick={() => setSelectedId(d.id)}
										className="cursor-pointer border-(--line) hover:bg-(--surface-2)"
									>
										<TableCell className="font-medium text-(--ink)">
											{formatNGN(d.amount)}
										</TableCell>
										<TableCell>
											<StatusBadge tone={disbursementStatusTone[d.status]}>
												{disbursementStatusLabel[d.status]}
											</StatusBadge>
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{formatPeriod(d.periodStart, d.periodEnd)}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{d.invoiceCount}
										</TableCell>
										<TableCell className="text-(--ink-3)">
											{d.createdAt ? formatDate(d.createdAt) : "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Mobile cards */}
					<div className="flex flex-col gap-3 md:hidden">
						{disbursements.map((d) => (
							<button
								key={d.id}
								type="button"
								onClick={() => setSelectedId(d.id)}
								className="flex flex-col gap-1.5 rounded-2xl border border-(--line) bg-(--surface-1) p-4 text-left"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium text-(--ink)">
										{formatNGN(d.amount)}
									</span>
									<StatusBadge tone={disbursementStatusTone[d.status]}>
										{disbursementStatusLabel[d.status]}
									</StatusBadge>
								</div>
								<div className="text-xs text-(--ink-3)">
									{formatPeriod(d.periodStart, d.periodEnd)} · {d.invoiceCount}{" "}
									invoice{d.invoiceCount === 1 ? "" : "s"}
								</div>
							</button>
						))}
					</div>

					<div className="flex items-center justify-between gap-3">
						<PageSizeSelect value={size} onChange={handleSizeChange} />
						{pageCount > 1 && (
							<Pagination className="w-auto flex-1 justify-end">
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
									{Array.from({ length: pageCount }, (_, i) => i + 1).map(
										(p) => (
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
										),
									)}
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
					</div>
				</div>
			)}

			<BankAccountSheet open={bankSheetOpen} onOpenChange={setBankSheetOpen} />

			<Dialog open={triggerConfirmOpen} onOpenChange={setTriggerConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Trigger a payout?</DialogTitle>
						<DialogDescription>
							This sends every invoice paid since your last successful payout to
							your saved bank account. This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setTriggerConfirmOpen(false)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							onClick={() => triggerMutation.mutate()}
							disabled={triggerMutation.isPending}
							className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							{triggerMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Triggering…
								</>
							) : (
								"Trigger payout"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Sheet
				open={selectedId !== null}
				onOpenChange={(open) => !open && setSelectedId(null)}
			>
				<SheetContent
					side="right"
					className="w-full border-(--line) bg-(--surface-1) sm:max-w-120"
				>
					{selectedPayout && (
						<>
							<SheetHeader className="pb-4">
								<SheetTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
									{formatNGN(selectedPayout.amount)}
								</SheetTitle>
								<SheetDescription className="text-(--ink-2)">
									{formatPeriod(
										selectedPayout.periodStart,
										selectedPayout.periodEnd,
									)}
								</SheetDescription>
							</SheetHeader>
							<div className="flex flex-col gap-4 px-8 pb-8">
								<StatusBadge
									tone={disbursementStatusTone[selectedPayout.status]}
									className="w-fit"
								>
									{disbursementStatusLabel[selectedPayout.status]}
								</StatusBadge>

								<div className="flex flex-col gap-1">
									<p className="m-0 text-sm text-(--ink-2)">
										{selectedPayout.invoiceCount} invoice
										{selectedPayout.invoiceCount === 1 ? "" : "s"}
									</p>
									{selectedPayout.createdAt && (
										<p className="m-0 text-sm text-(--ink-2)">
											Created{" "}
											<span className="font-heading text-xs text-(--ink)">
												{formatDate(selectedPayout.createdAt)}
											</span>
										</p>
									)}
									{selectedPayout.resolvedAt && (
										<p className="m-0 text-sm text-(--ink-2)">
											Resolved{" "}
											<span className="font-heading text-xs text-(--ink)">
												{formatDate(selectedPayout.resolvedAt)}
											</span>
										</p>
									)}
								</div>

								{selectedPayout.nombaTransferReference && (
									<div>
										<p className="island-kicker m-0">Transfer reference</p>
										<p className="mt-1 font-heading text-xs text-(--ink-2)">
											{selectedPayout.nombaTransferReference}
										</p>
									</div>
								)}

								{selectedPayout.failureReason && (
									<div>
										<p className="island-kicker m-0 text-destructive">
											Failure reason
										</p>
										<p className="mt-1 text-sm text-(--ink-2)">
											{selectedPayout.failureReason}
										</p>
									</div>
								)}
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}
