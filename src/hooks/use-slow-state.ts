import { useCallback, useEffect, useRef, useState } from "react";

export type SlowStateTier = "idle" | "slow" | "delayed" | "very_delayed";

const SLOW_MS = 300;
const DELAYED_MS = 1500;
const VERY_DELAYED_MS = 4000;

/**
 * Implements the loading-tier thresholds from
 * docs/frontend-error-and-loading-strategy.md: idle -> slow (300ms) ->
 * delayed (1500ms) -> very_delayed (4000ms). Call `start()` when a request
 * begins and `reset()` when it settles (success or failure).
 */
export function useSlowState() {
	const [tier, setTier] = useState<SlowStateTier>("idle");
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	const clearTimers = useCallback(() => {
		for (const timer of timersRef.current) clearTimeout(timer);
		timersRef.current = [];
	}, []);

	const start = useCallback(() => {
		clearTimers();
		setTier("idle");
		timersRef.current = [
			setTimeout(() => setTier("slow"), SLOW_MS),
			setTimeout(() => setTier("delayed"), DELAYED_MS),
			setTimeout(() => setTier("very_delayed"), VERY_DELAYED_MS),
		];
	}, [clearTimers]);

	const reset = useCallback(() => {
		clearTimers();
		setTier("idle");
	}, [clearTimers]);

	useEffect(() => clearTimers, [clearTimers]);

	return { tier, start, reset };
}
