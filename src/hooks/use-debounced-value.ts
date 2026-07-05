import { useEffect, useState } from "react";

/**
 * Delays updating the returned value until `value` has stopped changing for
 * `delayMs`. Used to avoid firing a real backend request (server-side search)
 * on every keystroke now that list pages query the backend per page/filter
 * change instead of filtering an already-fetched array in memory.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}
