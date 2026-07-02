import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { CATEGORY_COPY, classifyError } from "#/lib/api/classify-error.ts";

/**
 * Shared mutation error handler. Query/loader failures already get clean
 * handling for free via the router-level RootErrorFallback (including a
 * redirect on session expiry) — mutation `onError` callbacks don't go
 * through any router boundary, so without this a session expiring mid-use
 * (e.g. cancelling a subscription) just toasts the raw backend string and
 * leaves the user on a dead, stale-looking form. See
 * docs/frontend-error-and-loading-strategy.md, "Refresh fails during
 * active dashboard use".
 */
export function useHandleMutationError() {
	const navigate = useNavigate();

	return (error: unknown, options?: { fallbackMessage?: string }) => {
		const message = error instanceof Error ? error.message : String(error);
		const category = classifyError(message);

		if (category === "auth_expired") {
			toast.error(CATEGORY_COPY.auth_expired);
			navigate({ to: "/auth/login" });
			return;
		}

		if (category === "network") {
			toast.error(CATEGORY_COPY.network);
			return;
		}

		toast.error(message || options?.fallbackMessage || CATEGORY_COPY.server);
	};
}
