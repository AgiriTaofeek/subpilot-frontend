import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import {
	apiKeyResponseSchema,
	messageResponseSchema,
} from "#/lib/api/response-schemas.ts";
import type { ApiKeyResponseDto } from "#/types/api.ts";

export const listApiKeys = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		return backendRequest<ApiKeyResponseDto[]>({
			path: "/v1/settings/api-keys",
			responseSchema: z.array(apiKeyResponseSchema()),
		});
	});

const createApiKeySchema = z.object({
	label: z.string().min(1),
});

export const createApiKey = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(createApiKeySchema)
	.handler(async ({ data }) => {
		return backendRequest<ApiKeyResponseDto>({
			path: "/v1/settings/api-keys",
			method: "POST",
			body: { label: data.label },
			responseSchema: apiKeyResponseSchema(),
		});
	});

const apiKeyIdSchema = z.object({
	apiKeyId: z.string().min(1),
});

export const revokeApiKey = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(apiKeyIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<{ message: string }>({
			path: `/v1/settings/api-keys/${data.apiKeyId}`,
			method: "DELETE",
			responseSchema: messageResponseSchema(),
		});
	});
