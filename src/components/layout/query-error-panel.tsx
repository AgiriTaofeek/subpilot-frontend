import { WarningCircleIcon } from "@phosphor-icons/react";

import { Button } from "#/components/ui/button.tsx";
import { CATEGORY_COPY, classifyError } from "#/lib/api/classify-error.ts";
import { cn } from "#/lib/utils.ts";

/**
 * Inline error panel for isolating a single failed section (e.g. a
 * secondary card on a page whose primary content already loaded) without
 * taking down the whole page. For a route's primary/blocking data, the
 * router-level RootErrorFallback (src/components/layout/root-error-fallback.tsx)
 * is the right tool instead — it's the only one that can redirect to login.
 */
export function QueryErrorPanel({
	error,
	onRetry,
	className,
}: {
	error: unknown;
	onRetry?: () => void;
	className?: string;
}) {
	const message = error instanceof Error ? error.message : String(error);
	const category = classifyError(message);
	const copy =
		category === "not_found" || category === "server"
			? message
			: CATEGORY_COPY[category];

	return (
		<div
			className={cn(
				"flex flex-col items-center gap-3 rounded-md border border-dashed border-(--line) bg-(--surface-1) p-6 text-center",
				className,
			)}
		>
			<WarningCircleIcon className="size-6 text-destructive" />
			<p className="m-0 text-sm text-(--ink-2)">{copy}</p>
			{onRetry && category !== "auth_expired" && (
				<Button
					variant="outline"
					size="sm"
					onClick={onRetry}
					className="border-(--line)"
				>
					Try again
				</Button>
			)}
		</div>
	);
}
