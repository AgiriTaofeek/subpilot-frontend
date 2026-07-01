import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { backendRequest } from "#/lib/api/backend.ts";
import type {
	CheckoutInitResponseDto,
	CreatePlanRequestDto,
	PageResponse,
	PlanResponseDto,
	PublicPlanResponseDto,
	UpdatePlanRequestDto,
} from "#/types/api.ts";

const planIdSchema = z.object({
	planId: z.string().min(1),
});

const createPlanSchema = z.object({
	name: z.string().min(2),
	description: z.string().nullable(),
	amount: z.number().positive(),
	currency: z.string().min(3),
	billingInterval: z.enum([
		"daily",
		"weekly",
		"monthly",
		"quarterly",
		"yearly",
		"custom",
	]),
	intervalValue: z.number().int().positive().optional(),
	intervalUnit: z.string().optional(),
	trialDays: z.number().int().min(0),
	prorationPolicy: z.enum(["none", "credit", "charge"]),
});

const updatePlanSchema = z.object({
	planId: z.string().min(1),
	name: z.string().min(2).optional(),
	description: z.string().nullable().optional(),
	trialDays: z.number().int().min(0).optional(),
});

const publicPlanSchema = z.object({
	merchantSlug: z.string().min(1),
	planSlug: z.string().min(1),
});

const checkoutSchema = z.object({
	merchantSlug: z.string().min(1),
	planSlug: z.string().min(1),
	email: z.email(),
	fullName: z.string().min(2),
	phone: z.string().min(1),
});

export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
	return backendRequest<PageResponse<PlanResponseDto>>({
		path: "/v1/plans",
		search: { page: 0, perPage: 100 },
	});
});

export const getPlan = createServerFn({ method: "GET" })
	.validator(planIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<PlanResponseDto>({
			path: `/v1/plans/${data.planId}`,
		});
	});

export const createPlan = createServerFn({ method: "POST" })
	.validator(createPlanSchema)
	.handler(async ({ data }) => {
		return backendRequest<PlanResponseDto>({
			path: "/v1/plans",
			method: "POST",
			body: data satisfies CreatePlanRequestDto,
		});
	});

export const updatePlan = createServerFn({ method: "POST" })
	.validator(updatePlanSchema)
	.handler(async ({ data }) => {
		const request: UpdatePlanRequestDto = {};

		if (data.name !== undefined) request.name = data.name;
		if (data.description !== undefined) request.description = data.description;
		if (data.trialDays !== undefined) request.trialDays = data.trialDays;

		return backendRequest<PlanResponseDto>({
			path: `/v1/plans/${data.planId}`,
			method: "PATCH",
			body: request,
		});
	});

export const publishPlan = createServerFn({ method: "POST" })
	.validator(planIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<PlanResponseDto>({
			path: `/v1/plans/${data.planId}/publish`,
			method: "POST",
		});
	});

export const archivePlan = createServerFn({ method: "POST" })
	.validator(planIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<PlanResponseDto>({
			path: `/v1/plans/${data.planId}/archive`,
			method: "POST",
		});
	});

export const getPublicPlan = createServerFn({ method: "GET" })
	.validator(publicPlanSchema)
	.handler(async ({ data }) => {
		return backendRequest<PublicPlanResponseDto>({
			path: `/v1/public/plans/${data.merchantSlug}/${data.planSlug}`,
			forwardCookies: false,
		});
	});

export const initiateCheckout = createServerFn({ method: "POST" })
	.validator(checkoutSchema)
	.handler(async ({ data }) => {
		return backendRequest<CheckoutInitResponseDto>({
			path: `/v1/public/plans/${data.merchantSlug}/${data.planSlug}/checkout`,
			method: "POST",
			body: {
				email: data.email,
				fullName: data.fullName,
				phone: data.phone,
				merchantSlug: data.merchantSlug,
				planSlug: data.planSlug,
			},
			forwardCookies: false,
		});
	});
