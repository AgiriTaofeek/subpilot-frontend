import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
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

// Both schemas below mirror co.subpilot.plan.dto.PlanDtos.PublicPlanResponse
// and co.subpilot.subscription.dto.SubscriptionDtos.CheckoutInitResponse
// field-for-field. This is the one hop in the checkout flow with no
// authenticated session to fall back on if something's wrong, and
// checkoutUrl feeds straight into window.location.assign — validating it
// here turns a silent "navigate to /undefined" into a caught, classifiable
// error instead.
const publicPlanResponseSchema = z.object({
	name: z.string(),
	description: z.string().nullable(),
	amount: z.number(),
	currency: z.string(),
	billingInterval: z.enum([
		"daily",
		"weekly",
		"monthly",
		"quarterly",
		"yearly",
		"custom",
	]),
	trialDays: z.number(),
	merchantName: z.string(),
	merchantSlug: z.string(),
	planSlug: z.string(),
});

const checkoutInitResponseSchema = z.object({
	subscriptionId: z.string(),
	checkoutUrl: z.string(),
	checkoutReference: z.string(),
});

// Full-catalog fetch for reference/dropdown consumers (plan selectors on the
// subscription and account pages) — plan counts are bounded by how many
// pricing plans a merchant has configured, not by customer/transaction
// volume, so one generous page is the right shape here, unlike the
// customer/invoice/subscription lists this repo's other list endpoints back.
export const listPlans = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		const page = await backendRequest<PageResponse<PlanResponseDto>>({
			path: "/v1/plans",
			search: { page: 0, perPage: 100 },
		});
		return page.content;
	});

const searchPlansSchema = z.object({
	q: z.string().optional(),
	status: z.enum(["draft", "published", "archived"]).optional(),
	sort: z.string().optional(),
	page: z.number().default(0),
	perPage: z.number().default(10),
});

// Real server-side pagination for the Plans list page itself — backend
// supports q/status filtering and a "field,direction" sort string
// (PlanController.parseSort) for name/amountKobo/trialDays/status/createdAt.
export const searchPlans = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(searchPlansSchema)
	.handler(async ({ data }) => {
		return backendRequest<PageResponse<PlanResponseDto>>({
			path: "/v1/plans",
			search: {
				q: data.q,
				status: data.status,
				sort: data.sort,
				page: data.page,
				perPage: data.perPage,
			},
		});
	});

export const getPlan = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.validator(planIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<PlanResponseDto>({
			path: `/v1/plans/${data.planId}`,
		});
	});

export const createPlan = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(createPlanSchema)
	.handler(async ({ data }) => {
		return backendRequest<PlanResponseDto>({
			path: "/v1/plans",
			method: "POST",
			body: data satisfies CreatePlanRequestDto,
		});
	});

export const updatePlan = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
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
	.middleware([requireSessionCookieMiddleware])
	.validator(planIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<PlanResponseDto>({
			path: `/v1/plans/${data.planId}/publish`,
			method: "POST",
		});
	});

export const archivePlan = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
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
			responseSchema: publicPlanResponseSchema,
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
			responseSchema: checkoutInitResponseSchema,
		});
	});
