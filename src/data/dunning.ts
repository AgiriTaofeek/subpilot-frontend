import { queryOptions } from "@tanstack/react-query";

import { listDunningCampaigns } from "#/lib/api/dunning.ts";
import type {
	DunningEmailTemplateDto,
	DunningStepActionDto,
} from "#/types/api.ts";

export const dunningCampaignsQueryOptions = () =>
	queryOptions({
		queryKey: ["dunning-campaigns"],
		queryFn: () => listDunningCampaigns(),
	});

export const dunningStepActionLabel: Record<DunningStepActionDto, string> = {
	retry_charge: "Retry charge",
	send_email: "Send email",
	both: "Retry charge + send email",
};

export const dunningEmailTemplateLabel: Record<
	DunningEmailTemplateDto,
	string
> = {
	payment_failed: "Payment failed",
	final_warning: "Final warning",
	service_suspended: "Service suspended",
};
