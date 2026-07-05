import { z } from "zod";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/**
 * Validates a `size` search param against the allowed page sizes, falling
 * back to `defaultSize` for anything else (missing, malformed, or
 * hand-edited URLs). `.optional()` before the transform keeps `size` an
 * optional field on the *input* side (matching every other search param in
 * these routes), so existing `<Link search={{...}}>` call sites that don't
 * pass `size` still type-check.
 */
export function pageSizeSchema(defaultSize: PageSize) {
	return z
		.number()
		.optional()
		.transform(
			(value): PageSize =>
				value !== undefined &&
				(PAGE_SIZE_OPTIONS as readonly number[]).includes(value)
					? (value as PageSize)
					: defaultSize,
		)
		.catch(defaultSize);
}
