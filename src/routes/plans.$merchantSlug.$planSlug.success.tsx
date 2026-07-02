import { CheckCircleIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const successSearchSchema = z.object({
	ref: z.string().default(""),
});

/**
 * Real Nomba checkout callback destination — see
 * SubscriptionService.java:91 in sub-pilot, which redirects here as
 * `.../success?ref={subscriptionId}` once the customer completes payment.
 *
 * `ref` deliberately isn't used to look anything up: GET /v1/subscriptions/*
 * requires an authenticated merchant session (see SecurityConfig.java —
 * only /v1/public/**, /v1/portal/**, and a few auth/webhook routes are
 * permitAll), so an anonymous checkout customer landing here has no way to
 * poll real subscription status. There's also no public endpoint keyed off
 * a checkout reference. Flagged in docs/backend-dev-todo.md — until that
 * exists, this page shows an honest static confirmation instead of faking
 * a status check against data it can't actually read.
 */
export const Route = createFileRoute("/plans/$merchantSlug/$planSlug/success")({
	validateSearch: successSearchSchema,
	component: CheckoutSuccessPage,
	head: () => ({ meta: [{ title: "Payment received | SubPilot" }] }),
});

function CheckoutSuccessPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-(--surface) px-4">
			<div className="max-w-sm flex flex-col gap-4 rounded-2xl border border-(--line) bg-(--surface-1) p-8 text-center shadow-sm">
				<div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-(--success)/10 text-(--success)">
					<CheckCircleIcon className="size-6" weight="fill" />
				</div>
				<h1 className="text-lg font-semibold tracking-tight text-(--ink)">
					Payment received
				</h1>
				<p className="text-sm text-(--ink-3)">
					We're confirming your subscription now. This can take up to 30
					seconds. You'll get a confirmation email once it's ready — you can
					close this page.
				</p>
			</div>
		</div>
	);
}
