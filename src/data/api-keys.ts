import { queryOptions } from "@tanstack/react-query";

import { listApiKeys } from "#/lib/api/api-keys.ts";

export const apiKeysListQueryOptions = () =>
	queryOptions({
		queryKey: ["api-keys"],
		queryFn: () => listApiKeys(),
		// Configuration, not operational data — created/revoked rarely.
		staleTime: 120_000,
	});
