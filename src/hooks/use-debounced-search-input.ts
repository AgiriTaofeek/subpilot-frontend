import { useEffect, useRef, useState } from "react";

import { useDebouncedValue } from "#/hooks/use-debounced-value.ts";

/**
 * Local, instantly-responsive input state that only calls `onDebouncedChange`
 * (typically a URL search-param update feeding a server-paginated query)
 * after typing pauses — see use-debounced-value.ts for why this exists now
 * that list pages query the backend per filter change instead of filtering
 * an already-fetched array in memory. Stays in sync with `value` when it
 * changes from outside typing (e.g. back/forward navigation, "clear
 * filters" buttons).
 */
export function useDebouncedSearchInput(
	value: string,
	onDebouncedChange: (value: string) => void,
	delayMs = 300,
) {
	const [input, setInput] = useState(value);
	const debounced = useDebouncedValue(input, delayMs);
	const lastDebounced = useRef(debounced);

	useEffect(() => {
		if (lastDebounced.current !== debounced) {
			lastDebounced.current = debounced;
			onDebouncedChange(debounced);
		}
	}, [debounced, onDebouncedChange]);

	useEffect(() => {
		setInput(value);
	}, [value]);

	return [input, setInput] as const;
}
