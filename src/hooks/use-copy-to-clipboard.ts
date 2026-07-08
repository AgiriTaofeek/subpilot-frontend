import { useCallback } from "react";
import { toast } from "sonner";

interface CopyToClipboardOptions {
	successMessage?: string;
	duration?: number;
	/**
	 * Called instead of the default error toast — for surfaces (like a
	 * one-time secret reveal) where a toast could be missed or would cover
	 * other on-screen guidance, and an inline fallback is shown instead.
	 */
	onError?: () => void;
}

/**
 * Shared clipboard-copy helper — previously duplicated as a near-identical
 * try/catch/toast across 8 call sites. Returns a stable function reference
 * (safe to use inside a useMemo/useCallback dependency array) that resolves
 * to whether the copy succeeded, so callers can layer their own follow-up
 * state (e.g. a "copied" indicator) on top.
 */
export function useCopyToClipboard() {
	return useCallback(async (text: string, options?: CopyToClipboardOptions) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(
				options?.successMessage ?? "Copied",
				options?.duration !== undefined
					? { duration: options.duration }
					: undefined,
			);
			return true;
		} catch {
			if (options?.onError) {
				options.onError();
			} else {
				toast.error("Couldn't copy to clipboard.");
			}
			return false;
		}
	}, []);
}
