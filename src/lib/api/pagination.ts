import type { PageResponse } from "#/types/api.ts";

// Backend list endpoints cap at one page per request (100-200 items) with no
// free-text search support, so the UI's client-side search/pagination needs
// the *complete* dataset to behave correctly — otherwise records past the
// first page are silently invisible and unsearchable. This walks every page
// until the backend reports `last: true`.
const MAX_PAGES = 50;

// Overload kept id-constrained for the common case (compile-time safety, no
// key selector needed); the second overload covers DTOs whose identifier
// field isn't literally named `id` (e.g. `merchantId`) without callers having
// to reimplement this same dedupe loop.
export async function fetchAllPages<T extends { id: string }>(
	fetchPage: (page: number) => Promise<PageResponse<T>>,
): Promise<T[]>;
export async function fetchAllPages<T>(
	fetchPage: (page: number) => Promise<PageResponse<T>>,
	getId: (item: T) => string,
): Promise<T[]>;
export async function fetchAllPages<T>(
	fetchPage: (page: number) => Promise<PageResponse<T>>,
	getId: (item: T) => string = (item) => (item as { id: string }).id,
): Promise<T[]> {
	// Offset pagination drifts when records are created/removed between page
	// fetches, which can surface the same id on two consecutive pages — dedupe
	// by id so callers never render duplicate React keys from that drift.
	const byId = new Map<string, T>();
	let page = 0;
	let result: PageResponse<T>;

	do {
		result = await fetchPage(page);
		for (const item of result.content) {
			byId.set(getId(item), item);
		}
		page += 1;
	} while (!result.last && page < MAX_PAGES);

	return [...byId.values()];
}
