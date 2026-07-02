import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { backendRequest } from "#/lib/api/backend.ts";
import type {
	CreateDunningStepRequestDto,
	DunningCampaignDto,
	DunningStepDto,
	UpdateDunningCampaignRequestDto,
	UpdateDunningStepRequestDto,
} from "#/types/api.ts";

export const listDunningCampaigns = createServerFn({ method: "GET" }).handler(
	async () => {
		return backendRequest<DunningCampaignDto[]>({
			path: "/v1/dunning/campaigns",
		});
	},
);

const updateCampaignSchema = z.object({
	campaignId: z.string().min(1),
	name: z.string().max(100).optional(),
	gracePeriodDays: z.number().int().min(1).max(90).optional(),
	maxAttempts: z.number().int().min(1).max(10).optional(),
	cancelAfterExhaustion: z.boolean().optional(),
});

export const updateDunningCampaign = createServerFn({ method: "POST" })
	.validator(updateCampaignSchema)
	.handler(async ({ data }) => {
		const { campaignId, ...body } = data;
		return backendRequest<DunningCampaignDto>({
			path: `/v1/dunning/campaigns/${campaignId}`,
			method: "PATCH",
			body: body satisfies UpdateDunningCampaignRequestDto,
		});
	});

const addStepSchema = z.object({
	campaignId: z.string().min(1),
	dayOffset: z.number().int().min(0).max(90),
	action: z.enum(["retry_charge", "send_email", "both"]),
	emailTemplate: z
		.enum(["payment_failed", "final_warning", "service_suspended"])
		.optional(),
});

export const addDunningStep = createServerFn({ method: "POST" })
	.validator(addStepSchema)
	.handler(async ({ data }) => {
		const { campaignId, ...body } = data;
		return backendRequest<DunningStepDto>({
			path: `/v1/dunning/campaigns/${campaignId}/steps`,
			method: "POST",
			body: body satisfies CreateDunningStepRequestDto,
		});
	});

const updateStepSchema = z.object({
	campaignId: z.string().min(1),
	stepId: z.string().min(1),
	dayOffset: z.number().int().min(0).max(90).optional(),
	action: z.enum(["retry_charge", "send_email", "both"]).optional(),
	emailTemplate: z
		.enum(["payment_failed", "final_warning", "service_suspended"])
		.nullable()
		.optional(),
});

export const updateDunningStep = createServerFn({ method: "POST" })
	.validator(updateStepSchema)
	.handler(async ({ data }) => {
		const { campaignId, stepId, ...body } = data;
		return backendRequest<DunningStepDto>({
			path: `/v1/dunning/campaigns/${campaignId}/steps/${stepId}`,
			method: "PATCH",
			body: body satisfies UpdateDunningStepRequestDto,
		});
	});

const deleteStepSchema = z.object({
	campaignId: z.string().min(1),
	stepId: z.string().min(1),
});

export const deleteDunningStep = createServerFn({ method: "POST" })
	.validator(deleteStepSchema)
	.handler(async ({ data }) => {
		return backendRequest<{ message: string }>({
			path: `/v1/dunning/campaigns/${data.campaignId}/steps/${data.stepId}`,
			method: "DELETE",
		});
	});
