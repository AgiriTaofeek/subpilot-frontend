import type { KeyboardEvent } from "react";

/**
 * Props for a non-native element (e.g. a mobile card `<div>`) that should
 * behave like a link/button on click AND on keyboard activation. Putting
 * `onClick` directly on the element is the correct way to make its full
 * area — including child text — clickable (clicks bubble up through
 * ancestors); the previous pattern of an absolutely-positioned overlay
 * `<button>` sibling under `relative z-10` content siblings looked
 * equivalent but wasn't: those siblings, having the higher z-index, win
 * hit-testing over their own occupied area and swallow the click before it
 * ever reaches the button underneath.
 */
export function activatableRowProps(onActivate: () => void) {
	return {
		role: "button" as const,
		tabIndex: 0,
		onClick: onActivate,
		onKeyDown: (event: KeyboardEvent) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				onActivate();
			}
		},
	};
}
