import { HttpResponse, http } from "msw";
import { describe, expect, test, vi } from "vitest";

import {
	getOptionalMerchantSessionRequest,
	signupMerchantRequest,
} from "#/lib/api/auth.ts";
import { mockResponseHeaders, server } from "#/test/setup.ts";

describe("signupMerchantRequest", () => {
	test("returns the backend session payload and forwards every Set-Cookie header", async () => {
		vi.stubEnv("VITE_API_BASE_URL", "https://api.test");

		server.use(
			http.post("https://api.test/v1/auth/signup", async ({ request }) => {
				expect(await request.json()).toEqual({
					businessName: "Acme Corp",
					email: "hello@acme.test",
					password: "Password123!",
				});

				// A real signup response sets session + refresh + csrf
				// cookies together — regression coverage for a bug where
				// only the last Set-Cookie header of several survived.
				const backendCookies = new Headers();
				backendCookies.append(
					"set-cookie",
					"_subpilot_session=session_123; Path=/; HttpOnly; SameSite=Lax",
				);
				backendCookies.append(
					"set-cookie",
					"_subpilot_refresh=refresh_123; Path=/; HttpOnly; SameSite=Lax",
				);
				backendCookies.append(
					"set-cookie",
					"_subpilot_csrf=csrf_123; Path=/; SameSite=Lax",
				);

				return new HttpResponse(
					JSON.stringify({
						merchantId: "merch_123",
						userId: "user_123",
						email: "hello@acme.test",
						businessName: "Acme Corp",
						status: "active",
					}),
					{ headers: backendCookies },
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
			status: "active",
		});

		const forwarded = mockResponseHeaders.getSetCookie();
		expect(forwarded).toHaveLength(3);
		expect(forwarded.some((c) => c.startsWith("_subpilot_session="))).toBe(
			true,
		);
		expect(forwarded.some((c) => c.startsWith("_subpilot_refresh="))).toBe(
			true,
		);
		expect(forwarded.some((c) => c.startsWith("_subpilot_csrf="))).toBe(true);
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

	// This check exists purely to redirect an already-logged-in merchant away
	// from /auth/login — it must never be allowed to crash the login page
	// itself. A regression here previously re-threw anything but 401/403
	// (e.g. a real backend outage), which crashed the entire /auth route
	// instead of just rendering the login form as if signed out.
	test("treats a backend outage (502) as signed out too, not a crash", async () => {
		vi.stubEnv("VITE_API_BASE_URL", "https://api.test");

		server.use(
			http.get(
				"https://api.test/v1/auth/me",
				() => new HttpResponse("<html>Bad Gateway</html>", { status: 502 }),
			),
		);

		await expect(getOptionalMerchantSessionRequest()).resolves.toBeNull();
	});
});
