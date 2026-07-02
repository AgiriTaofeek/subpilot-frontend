import { queryOptions } from "@tanstack/react-query";

import {
	getPortalSubscription,
	listPortalAvailablePlans,
	listPortalInvoices,
} from "#/lib/api/portal.ts";
import type { PortalSubscriptionViewDto } from "#/types/api.ts";

export type PortalSubscription = PortalSubscriptionViewDto;

export const portalSubscriptionQueryOptions = (token: string) =>
	queryOptions({
		queryKey: ["portal", token, "subscription"],
		queryFn: () => getPortalSubscription({ data: { token } }),
	});

export const portalInvoicesQueryOptions = (token: string) =>
	queryOptions({
		queryKey: ["portal", token, "invoices"],
		queryFn: () => listPortalInvoices({ data: { token } }),
	});

export const portalAvailablePlansQueryOptions = (token: string) =>
	queryOptions({
		queryKey: ["portal", token, "available-plans"],
		queryFn: () => listPortalAvailablePlans({ data: { token } }),
	});
