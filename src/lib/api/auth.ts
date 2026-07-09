import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	backendRequest,
	requireSessionCookieMiddleware,
} from "#/lib/api/backend.ts";
import {
	authSessionSchema,
	messageResponseSchema,
} from "#/lib/api/response-schemas.ts";
import type { AuthSessionDto } from "#/types/api.ts";

const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});

const signupSchema = z.object({
	businessName: z.string().min(2),
	email: z.email(),
	password: z.string().min(8),
});

const changePasswordSchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: z.string().min(8),
});

export async function loginMerchantRequest(data: z.infer<typeof loginSchema>) {
	return backendRequest<AuthSessionDto>({
		path: "/v1/auth/login",
		method: "POST",
		body: data,
		responseSchema: authSessionSchema(),
	});
}

export async function signupMerchantRequest(
	data: z.infer<typeof signupSchema>,
) {
	return backendRequest<AuthSessionDto>({
		path: "/v1/auth/signup",
		method: "POST",
		body: data,
		responseSchema: authSessionSchema(),
	});
}

export async function logoutMerchantRequest() {
	return backendRequest<{ message: string }>({
		path: "/v1/auth/logout",
		method: "POST",
		responseSchema: messageResponseSchema(),
	});
}

export async function changePasswordMerchantRequest(
	data: z.infer<typeof changePasswordSchema>,
) {
	return backendRequest<{ message: string }>({
		path: "/v1/auth/change-password",
		method: "PATCH",
		body: data,
		responseSchema: messageResponseSchema(),
	});
}

export async function getMerchantSessionRequest() {
	return backendRequest<AuthSessionDto>({
		path: "/v1/auth/me",
		responseSchema: authSessionSchema(),
	});
}

// Used only to redirect an already-logged-in merchant away from
// /auth/login|signup — a convenience, not a requirement, so any failure to
// determine the session (expired, backend down, network blip, ...) must
// fail OPEN rather than crash the auth route entirely. Logging in itself
// is a separate request with no dependency on this check succeeding; a
// merchant who's actually still logged in just sees the login page once
// more instead of being auto-redirected, which is a far better failure
// mode than being unable to load the login page at all.
export async function getOptionalMerchantSessionRequest() {
	try {
		return await getMerchantSessionRequest();
	} catch {
		return null;
	}
}

export const loginMerchant = createServerFn({ method: "POST" })
	.validator(loginSchema)
	.handler(async ({ data }) => loginMerchantRequest(data));

export const signupMerchant = createServerFn({ method: "POST" })
	.validator(signupSchema)
	.handler(async ({ data }) => signupMerchantRequest(data));

export const getMerchantSession = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => getMerchantSessionRequest());

export const getOptionalMerchantSession = createServerFn({
	method: "GET",
}).handler(async () => getOptionalMerchantSessionRequest());

export const logoutMerchant = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => logoutMerchantRequest());

export const changePasswordMerchant = createServerFn({ method: "POST" })
	.middleware([requireSessionCookieMiddleware])
	.validator(changePasswordSchema)
	.handler(async ({ data }) => changePasswordMerchantRequest(data));
