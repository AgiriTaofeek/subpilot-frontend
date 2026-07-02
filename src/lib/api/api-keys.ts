import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { backendRequest } from "#/lib/api/backend.ts";
import type { ApiKeyResponseDto } from "#/types/api.ts";

export const listApiKeys = createServerFn({ method: "GET" }).handler(
	async () => {
		return backendRequest<ApiKeyResponseDto[]>({
			path: "/v1/settings/api-keys",
		});
	},
);

const createApiKeySchema = z.object({
	label: z.string().min(1),
});

export const createApiKey = createServerFn({ method: "POST" })
	.validator(createApiKeySchema)
	.handler(async ({ data }) => {
		return backendRequest<ApiKeyResponseDto>({
			path: "/v1/settings/api-keys",
			method: "POST",
			body: { label: data.label },
		});
	});

const apiKeyIdSchema = z.object({
	apiKeyId: z.string().min(1),
});

export const revokeApiKey = createServerFn({ method: "POST" })
	.validator(apiKeyIdSchema)
	.handler(async ({ data }) => {
		return backendRequest<{ message: string }>({
			path: `/v1/settings/api-keys/${data.apiKeyId}`,
			method: "DELETE",
		});
	});
