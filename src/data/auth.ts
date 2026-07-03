import { queryOptions } from "@tanstack/react-query";

import { getMerchantSession } from "#/lib/api/auth.ts";

export const merchantSessionQueryOptions = () =>
	queryOptions({
		queryKey: ["merchant-session"],
		queryFn: () => getMerchantSession(),
		// _dashboard's beforeLoad re-checks this on every dashboard navigation
		// AND every sidebar intent-preload (hover). A short staleTime collapses
		// a burst of hovers/navigations into one real check instead of firing
		// a fresh session-validation request on every single one, while still
		// re-validating often enough that an expired session gets caught fast.
		staleTime: 15_000,
	});
