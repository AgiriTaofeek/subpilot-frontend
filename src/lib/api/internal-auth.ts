import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSessionCookieMiddleware } from "#/lib/api/backend.ts";
import { internalBackendRequest } from "#/lib/api/internal-backend.ts";
import {
	internalAdminSessionSchema,
	messageResponseSchema,
} from "#/lib/api/response-schemas.ts";
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
			responseSchema: internalAdminSessionSchema(),
		});
	});

async function getInternalAdminSessionRequest() {
	return internalBackendRequest<InternalAdminSessionDto>({
		path: "/v1/internal/auth/me",
		responseSchema: internalAdminSessionSchema(),
	});
}

export const getInternalAdminSession = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => getInternalAdminSessionRequest());

// Used only to redirect an already-logged-in staff member away from
// /internal/login — a convenience, not a requirement, so ANY failure to
// determine the session (expired, backend down, network blip, ...) must
// fail OPEN rather than crash the login route entirely. Logging in itself
// is a separate request with no dependency on this check succeeding.
// Mirrors getOptionalMerchantSessionRequest in auth.ts — see its comment.
export const getOptionalInternalAdminSession = createServerFn({
	method: "GET",
}).handler(async () => {
	try {
		return await getInternalAdminSessionRequest();
	} catch {
		return null;
	}
});

export const logoutInternalAdmin = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		return internalBackendRequest<{ message: string }>({
			path: "/v1/internal/auth/logout",
			method: "POST",
			responseSchema: messageResponseSchema(),
		});
	});
