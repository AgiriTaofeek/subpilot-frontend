import type { PageResponse } from "#/types/api.ts";

// Backend list endpoints cap at one page per request (100-200 items) with no
// free-text search support, so the UI's client-side search/pagination needs
// the *complete* dataset to behave correctly — otherwise records past the
// first page are silently invisible and unsearchable. This walks every page
// until the backend reports `last: true`.
const MAX_PAGES = 50;

export async function fetchAllPages<T extends { id: string }>(
	fetchPage: (page: number) => Promise<PageResponse<T>>,
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
			byId.set(item.id, item);
		}
		page += 1;
	} while (!result.last && page < MAX_PAGES);

	return [...byId.values()];
}
