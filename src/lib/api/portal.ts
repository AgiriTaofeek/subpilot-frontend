import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { backendRequest } from "#/lib/api/backend.ts";
import {
	changePlanResponseSchema,
	portalAvailablePlanSchema,
	portalInvoiceViewSchema,
	portalSubscriptionViewSchema,
	portalUpdateCardResponseSchema,
} from "#/lib/api/response-schemas.ts";
import type {
	ChangePlanRequestDto,
	ChangePlanResponseDto,
	PortalAvailablePlanDto,
	PortalCancelRequestDto,
	PortalInvoiceViewDto,
	PortalSubscriptionViewDto,
	PortalUpdateCardResponseDto,
} from "#/types/api.ts";

const tokenSchema = z.object({
	token: z.string().min(1),
});

const cancelSchema = z.object({
	token: z.string().min(1),
	reason: z.string().max(500).optional(),
});

const changePlanSchema = z.object({
	token: z.string().min(1),
	newPlanId: z.string().min(1),
});

export const getPortalSubscription = createServerFn({ method: "GET" })
	.validator(tokenSchema)
	.handler(async ({ data }) => {
		return backendRequest<PortalSubscriptionViewDto>({
			path: `/v1/portal/${data.token}`,
			forwardCookies: false,
			responseSchema: portalSubscriptionViewSchema(),
		});
	});

export const listPortalInvoices = createServerFn({ method: "GET" })
	.validator(tokenSchema)
	.handler(async ({ data }) => {
		return backendRequest<PortalInvoiceViewDto[]>({
			path: `/v1/portal/${data.token}/invoices`,
			forwardCookies: false,
			responseSchema: z.array(portalInvoiceViewSchema()),
		});
	});

export const listPortalAvailablePlans = createServerFn({ method: "GET" })
	.validator(tokenSchema)
	.handler(async ({ data }) => {
		return backendRequest<PortalAvailablePlanDto[]>({
			path: `/v1/portal/${data.token}/available-plans`,
			forwardCookies: false,
			responseSchema: z.array(portalAvailablePlanSchema()),
		});
	});

export const cancelPortalSubscription = createServerFn({ method: "POST" })
	.validator(cancelSchema)
	.handler(async ({ data }) => {
		return backendRequest<PortalSubscriptionViewDto>({
			path: `/v1/portal/${data.token}/cancel`,
			method: "POST",
			body: { reason: data.reason } satisfies PortalCancelRequestDto,
			forwardCookies: false,
			responseSchema: portalSubscriptionViewSchema(),
		});
	});

export const changePortalPlan = createServerFn({ method: "POST" })
	.validator(changePlanSchema)
	.handler(async ({ data }) => {
		return backendRequest<ChangePlanResponseDto>({
			path: `/v1/portal/${data.token}/change-plan`,
			method: "POST",
			body: { newPlanId: data.newPlanId } satisfies ChangePlanRequestDto,
			forwardCookies: false,
			responseSchema: changePlanResponseSchema(),
		});
	});

export const updatePortalCard = createServerFn({ method: "POST" })
	.validator(tokenSchema)
	.handler(async ({ data }) => {
		return backendRequest<PortalUpdateCardResponseDto>({
			path: `/v1/portal/${data.token}/update-card`,
			method: "POST",
			forwardCookies: false,
			responseSchema: portalUpdateCardResponseSchema(),
		});
	});
