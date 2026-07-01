import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { BackendApiError, backendRequest } from "#/lib/api/backend.ts";
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

export async function loginMerchantRequest(data: z.infer<typeof loginSchema>) {
	return backendRequest<AuthSessionDto>({
		path: "/v1/auth/login",
		method: "POST",
		body: data,
	});
}

export async function signupMerchantRequest(
	data: z.infer<typeof signupSchema>,
) {
	return backendRequest<AuthSessionDto>({
		path: "/v1/auth/signup",
		method: "POST",
		body: data,
	});
}

export async function logoutMerchantRequest() {
	return backendRequest<{ message: string }>({
		path: "/v1/auth/logout",
		method: "POST",
	});
}

export async function getMerchantSessionRequest() {
	return backendRequest<AuthSessionDto>({
		path: "/v1/auth/me",
	});
}

export async function getOptionalMerchantSessionRequest() {
	try {
		return await getMerchantSessionRequest();
	} catch (error) {
		if (error instanceof BackendApiError && error.status === 401) {
			return null;
		}

		throw error;
	}
}

export const loginMerchant = createServerFn({ method: "POST" })
	.validator(loginSchema)
	.handler(async ({ data }) => loginMerchantRequest(data));

export const signupMerchant = createServerFn({ method: "POST" })
	.validator(signupSchema)
	.handler(async ({ data }) => signupMerchantRequest(data));

export const getMerchantSession = createServerFn({ method: "GET" }).handler(
	async () => getMerchantSessionRequest(),
);

export const getOptionalMerchantSession = createServerFn({
	method: "GET",
}).handler(async () => getOptionalMerchantSessionRequest());

export const logoutMerchant = createServerFn({ method: "POST" }).handler(
	async () => logoutMerchantRequest(),
);
