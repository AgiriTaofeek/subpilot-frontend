import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	isUnauthenticatedBackendError,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
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

async function getInternalAdminSessionRequest() {
	return internalBackendRequest<InternalAdminSessionDto>({
		path: "/v1/internal/auth/me",
	});
}

export const getInternalAdminSession = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => getInternalAdminSessionRequest());

// Absence of a cookie (or a rejected one) is a valid "logged out" result
// here, not an error — mirrors getOptionalMerchantSession in auth.ts, used
// by internal.login.tsx to redirect an already-authenticated staff member
// away from the login form instead of showing it again.
export const getOptionalInternalAdminSession = createServerFn({
	method: "GET",
}).handler(async () => {
	try {
		return await getInternalAdminSessionRequest();
	} catch (error) {
		if (isUnauthenticatedBackendError(error)) {
			return null;
		}
		throw error;
	}
});

export const logoutInternalAdmin = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		return internalBackendRequest<{ message: string }>({
			path: "/v1/internal/auth/logout",
			method: "POST",
		});
	});
