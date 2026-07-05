import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSessionCookieMiddleware } from "#/lib/api/backend.ts";
import { internalBackendRequest } from "#/lib/api/internal-backend.ts";
import type { InternalAdminSessionDto } from "#/types/api.ts";

const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});

export const loginInternalAdmin = createServerFn({ method: "POST" })
	.validator(loginSchema)
	.handler(async ({ data }) => {
		return internalBackendRequest<InternalAdminSessionDto>({
			path: "/v1/internal/auth/login",
			method: "POST",
			body: data,
		});
	});

export const getInternalAdminSession = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		return internalBackendRequest<InternalAdminSessionDto>({
			path: "/v1/internal/auth/me",
		});
	});

export const logoutInternalAdmin = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		return internalBackendRequest<{ message: string }>({
			path: "/v1/internal/auth/logout",
			method: "POST",
		});
	});
