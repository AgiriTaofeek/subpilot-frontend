import { queryOptions } from "@tanstack/react-query";

import { listApiKeys } from "#/lib/api/api-keys.ts";

export const apiKeysListQueryOptions = () =>
	queryOptions({
		queryKey: ["api-keys"],
		queryFn: () => listApiKeys(),
	});
