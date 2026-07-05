import { queryOptions } from "@tanstack/react-query";

import { getInternalAdminSession } from "#/lib/api/internal-auth.ts";

export const internalAdminSessionQueryOptions = () =>
	queryOptions({
		queryKey: ["internal-admin-session"],
		queryFn: () => getInternalAdminSession(),
		staleTime: 15_000,
	});
