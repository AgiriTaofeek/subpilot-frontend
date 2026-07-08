/**
 * Both authenticated layouts have a persistent sidebar, so without this a
 * keyboard/screen-reader user re-tabs through the whole nav on every
 * navigation. Hidden until focused; jumps straight to the main content id.
 */
export function SkipToContentLink() {
	return (
		<a
			href="#main-content"
			className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:border-(--line) focus:bg-(--surface-1) focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-(--ink) focus:shadow-md"
		>
			Skip to content
		</a>
	);
}
