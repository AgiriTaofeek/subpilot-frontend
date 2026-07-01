import { CheckCircleIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Button } from "#/components/ui/button.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { resolvePortalToken } from "#/data/portal.ts";

const returnSearchSchema = z.object({
	ref: z.string().default(""),
});

export const Route = createFileRoute("/checkout/return")({
	validateSearch: returnSearchSchema,
	component: CheckoutReturnPage,
	head: () => ({ meta: [{ title: "Confirming payment | SubPilot" }] }),
});

function CheckoutReturnPage() {
	const { ref } = Route.useSearch();
	const navigate = useNavigate();
	const [state, setState] = useState<"verifying" | "success" | "error">(
		"verifying",
	);

	useEffect(() => {
		// Simulate POSTing to the backend to verify the transaction reference.
		const verifyTimer = setTimeout(() => {
			const context = ref ? resolvePortalToken(ref) : null;
			if (!context) {
				setState("error");
				return;
			}
			setState("success");
		}, 1200);
		return () => clearTimeout(verifyTimer);
	}, [ref]);

	useEffect(() => {
		if (state !== "success") return;
		const redirectTimer = setTimeout(() => {
			navigate({ to: "/portal/$token", params: { token: ref } });
		}, 1200);
		return () => clearTimeout(redirectTimer);
	}, [state, ref, navigate]);

	if (state === "error") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-(--surface) px-4">
				<div className="max-w-sm flex flex-col gap-4 rounded-2xl border border-(--line) bg-(--surface-1) p-8 text-center shadow-sm">
					<h1 className="text-lg font-semibold tracking-tight text-(--ink)">
						We couldn't confirm your payment
					</h1>
					<p className="text-sm text-(--ink-3)">
						Something went wrong verifying your transaction.
					</p>
					<Button
						onClick={() => window.history.back()}
						className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
					>
						Try again
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-(--surface) px-4">
			<div className="max-w-sm flex flex-col gap-3 rounded-2xl border border-(--line) bg-(--surface-1) p-8 text-center shadow-sm">
				{state === "verifying" ? (
					<>
						<Spinner className="mx-auto size-8 text-(--ink-3)" />
						<h1 className="text-lg font-semibold tracking-tight text-(--ink)">
							Confirming your payment…
						</h1>
					</>
				) : (
					<>
						<CheckCircleIcon
							className="mx-auto size-8 text-(--brand)"
							weight="fill"
						/>
						<h1 className="text-lg font-semibold tracking-tight text-(--ink)">
							Payment confirmed
						</h1>
						<p className="text-sm text-(--ink-3)">
							Redirecting you to your subscription…
						</p>
					</>
				)}
			</div>
		</div>
	);
}
