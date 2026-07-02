import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Button } from "#/components/ui/button.tsx";
import { portalSubscriptionQueryOptions } from "#/data/portal.ts";
import { CATEGORY_COPY, classifyError } from "#/lib/api/classify-error.ts";

export const Route = createFileRoute("/portal/$token")({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			portalSubscriptionQueryOptions(params.token),
		);
	},
	component: PortalLayout,
	errorComponent: PortalErrorFallback,
	head: () => ({ meta: [{ title: "Customer portal | SubPilot" }] }),
});

function PortalErrorFallback({
	error,
	reset,
}: {
	error: Error;
	reset: () => void;
}) {
	// Only a genuinely not-found token means the link itself is dead — a
	// network blip or a transient backend error is retryable and shouldn't
	// tell the customer to go ask the business for a new link.
	const isNotFound = classifyError(error.message) === "not_found";

	return (
		<div className="flex min-h-screen items-center justify-center bg-(--surface) px-4">
			<div className="max-w-sm flex flex-col gap-3 rounded-2xl border border-(--line) bg-(--surface-1) p-8 text-center shadow-sm">
				<h1 className="text-lg font-semibold tracking-tight text-(--ink)">
					{isNotFound ? "This link is no longer valid" : "Something went wrong"}
				</h1>
				<p className="text-sm text-(--ink-3)">
					{isNotFound
						? "Please contact the business to get an updated link."
						: CATEGORY_COPY[classifyError(error.message)]}
				</p>
				{!isNotFound && (
					<Button
						variant="outline"
						onClick={reset}
						className="mx-auto w-fit border-(--line)"
					>
						Try again
					</Button>
				)}
			</div>
		</div>
	);
}

function PortalLayout() {
	return (
		<div className="flex min-h-screen flex-col bg-(--surface)">
			<header className="border-b border-(--line) px-4 py-4">
				<div className="mx-auto flex max-w-xl items-center gap-2">
					<span className="text-sm font-semibold tracking-tight text-(--ink)">
						SubPilot
					</span>
					<span className="text-(--ink-3)">·</span>
					<span className="font-heading text-[0.65rem] tracking-wide text-(--ink-3) uppercase">
						Customer portal
					</span>
				</div>
			</header>
			<main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
				<Outlet />
			</main>
		</div>
	);
}
