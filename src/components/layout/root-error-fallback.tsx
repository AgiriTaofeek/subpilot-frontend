import { Link } from "@tanstack/react-router";

import { RouteErrorFallback } from "#/components/layout/route-error-fallback.tsx";
import { Button } from "#/components/ui/button.tsx";
import { isSessionError } from "#/lib/api/is-session-error.ts";

export function RootErrorFallback({
	error,
	reset,
}: {
	error: Error;
	reset: () => void;
}) {
	if (isSessionError(error.message)) {
		return (
			<RouteErrorFallback
				title="Your session has expired"
				description="Please log in again to continue."
				action={
					<Button
						asChild
						className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
					>
						<Link to="/auth/login">Log in</Link>
					</Button>
				}
			/>
		);
	}

	return (
		<RouteErrorFallback
			title="Something went wrong"
			description="An unexpected error occurred. Try again, or head back to the homepage."
			action={
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={reset} className="border-(--line)">
						Try again
					</Button>
					<Button
						asChild
						className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
					>
						<a href="/">Go home</a>
					</Button>
				</div>
			}
		/>
	);
}
