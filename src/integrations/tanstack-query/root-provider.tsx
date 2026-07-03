import { QueryClient } from "@tanstack/react-query";

export function getContext() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: 1,
				// Without this, every query defaults to staleTime: 0 and
				// refetches on every mount — including navigating back to a
				// dashboard page visited seconds ago. 30s is fresh enough for
				// merchant-operated data that doesn't change every second;
				// queries that should behave differently set their own
				// staleTime explicitly (see src/data/*.ts).
				staleTime: 30_000,
			},
		},
	});

	return {
		queryClient,
	};
}
export default function TanstackQueryProvider() {}
