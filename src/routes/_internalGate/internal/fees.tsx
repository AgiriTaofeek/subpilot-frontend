import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { Field, FieldLabel } from "#/components/ui/field.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { internalDefaultFeeQueryOptions } from "#/data/internal-fees.ts";
import { useHandleMutationError } from "#/hooks/use-handle-mutation-error.ts";
import { updateInternalDefaultFee } from "#/lib/api/internal-fees.ts";
import { formatDate } from "#/lib/date.ts";

export const Route = createFileRoute("/_internalGate/internal/fees")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(internalDefaultFeeQueryOptions());
	},
	component: InternalFeesPage,
	head: () => ({ meta: [{ title: "Platform fees | SubPilot Internal" }] }),
});

function InternalFeesPage() {
	const queryClient = useQueryClient();
	const handleMutationError = useHandleMutationError();
	const { data: fee } = useSuspenseQuery(internalDefaultFeeQueryOptions());

	const [feeBps, setFeeBps] = useState(fee.feeBps);
	const [fixedFeeMinor, setFixedFeeMinor] = useState(fee.fixedFeeMinor);
	const [reason, setReason] = useState("");

	const mutation = useMutation({
		mutationFn: () =>
			updateInternalDefaultFee({ data: { feeBps, fixedFeeMinor, reason } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: internalDefaultFeeQueryOptions().queryKey,
			});
			setReason("");
			toast.success("Platform default fee updated");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't update the platform fee.",
			}),
	});

	const hasChanges =
		feeBps !== fee.feeBps || fixedFeeMinor !== fee.fixedFeeMinor;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Platform fees
			</h1>

			<Card className="max-w-xl border border-(--line) bg-(--surface-1) shadow-none">
				<CardHeader>
					<CardTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
						Default fee
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<p className="m-0 text-xs text-(--ink-3)">
						Applies to every merchant without a per-merchant override. Last
						updated {formatDate(fee.updatedAt)} by {fee.updatedByAdminId}.
					</p>

					<Field>
						<FieldLabel htmlFor="fee-bps">Fee (basis points)</FieldLabel>
						<input
							id="fee-bps"
							type="number"
							min={0}
							value={feeBps}
							onChange={(e) => setFeeBps(Number(e.target.value))}
							className="h-9 rounded-md border border-(--line) bg-(--surface) px-3 text-sm"
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="fee-fixed">Fixed fee (kobo)</FieldLabel>
						<input
							id="fee-fixed"
							type="number"
							min={0}
							value={fixedFeeMinor}
							onChange={(e) => setFixedFeeMinor(Number(e.target.value))}
							className="h-9 rounded-md border border-(--line) bg-(--surface) px-3 text-sm"
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="fee-reason">Reason</FieldLabel>
						<Textarea
							id="fee-reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Why is the platform default changing?"
							className="border-(--line) bg-(--surface)"
						/>
					</Field>

					<Button
						onClick={() => mutation.mutate()}
						disabled={
							mutation.isPending || !hasChanges || reason.trim().length === 0
						}
						className="w-fit"
					>
						{mutation.isPending ? (
							<>
								<Spinner data-icon="inline-start" />
								Saving…
							</>
						) : (
							"Save"
						)}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
