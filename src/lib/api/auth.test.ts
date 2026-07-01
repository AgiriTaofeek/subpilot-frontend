import { setResponseHeader } from "@tanstack/react-start/server";
import { HttpResponse, http } from "msw";
import { describe, expect, test, vi } from "vitest";

import {
	getOptionalMerchantSessionRequest,
	signupMerchantRequest,
} from "#/lib/api/auth.ts";
import { server } from "#/test/setup.ts";

describe("signupMerchantRequest", () => {
	test("returns the backend session payload and forwards the session cookie", async () => {
		vi.stubEnv("VITE_API_BASE_URL", "https://api.test");

		server.use(
			http.post("https://api.test/v1/auth/signup", async ({ request }) => {
				expect(await request.json()).toEqual({
					businessName: "Acme Corp",
					email: "hello@acme.test",
					password: "Password123!",
				});

				return HttpResponse.json(
					{
						merchantId: "merch_123",
						userId: "user_123",
						email: "hello@acme.test",
						businessName: "Acme Corp",
					},
					{
						headers: {
							"set-cookie":
								"_subpilot_session=session_123; Path=/; HttpOnly; SameSite=Lax",
						},
					},
				);
			}),
		);

		await expect(
			signupMerchantRequest({
				businessName: "Acme Corp",
				email: "hello@acme.test",
				password: "Password123!",
			}),
		).resolves.toEqual({
			merchantId: "merch_123",
			userId: "user_123",
			email: "hello@acme.test",
			businessName: "Acme Corp",
		});

		expect(setResponseHeader).toHaveBeenCalledWith(
			"set-cookie",
			"_subpilot_session=session_123; Path=/; HttpOnly; SameSite=Lax",
		);
	});

	test("surfaces the backend validation message", async () => {
		vi.stubEnv("VITE_API_BASE_URL", "https://api.test");

		server.use(
			http.post("https://api.test/v1/auth/signup", () =>
				HttpResponse.json(
					{
						error: {
							code: "EMAIL_TAKEN",
							message: "An account with this email already exists.",
						},
					},
					{ status: 409 },
				),
			),
		);

		await expect(
			signupMerchantRequest({
				businessName: "Acme Corp",
				email: "hello@acme.test",
				password: "Password123!",
			}),
		).rejects.toThrow("An account with this email already exists.");
	});
});

describe("getOptionalMerchantSessionRequest", () => {
	test("treats a 403 session check as signed out", async () => {
		vi.stubEnv("VITE_API_BASE_URL", "https://api.test");

		server.use(
			http.get(
				"https://api.test/v1/auth/me",
				() => new HttpResponse(null, { status: 403 }),
			),
		);

		await expect(getOptionalMerchantSessionRequest()).resolves.toBeNull();
	});
});
