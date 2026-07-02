import { getRequestHeader } from "@tanstack/react-start/server";
import { HttpResponse, http } from "msw";
import { describe, expect, test, vi } from "vitest";

import { backendRequest } from "#/lib/api/backend.ts";
import { mockResponseHeaders, server } from "#/test/setup.ts";
import type { AuthSessionDto } from "#/types/api.ts";

describe("backendRequest", () => {
	test("adds the CSRF header for cookie-authenticated mutations", async () => {
		vi.stubEnv("VITE_API_BASE_URL", "https://api.test");
		vi.mocked(getRequestHeader).mockImplementation((name: string) =>
			name === "cookie"
				? "_subpilot_session=session_123; _subpilot_csrf=csrf_123"
				: undefined,
		);

		server.use(
			http.post("https://api.test/v1/plans", async ({ request }) => {
				expect(request.headers.get("x-csrf-token")).toBe("csrf_123");
				expect(request.headers.get("cookie")).toContain(
					"_subpilot_session=session_123",
				);

				return HttpResponse.json({ ok: true });
			}),
		);

		await expect(
			backendRequest<{ ok: boolean }>({
				path: "/v1/plans",
				method: "POST",
				body: { name: "Starter" },
			}),
		).resolves.toEqual({ ok: true });
	});

	test("refreshes and retries a protected request after a 401", async () => {
		vi.stubEnv("VITE_API_BASE_URL", "https://api.test");
		vi.mocked(getRequestHeader).mockImplementation((name: string) =>
			name === "cookie"
				? "_subpilot_session=stale_session; _subpilot_refresh=refresh_123"
				: undefined,
		);

		let meCalls = 0;

		server.use(
			http.get("https://api.test/v1/auth/me", ({ request }) => {
				meCalls += 1;

				if (meCalls === 1) {
					expect(request.headers.get("cookie")).toContain(
						"_subpilot_session=stale_session",
					);
					return new HttpResponse(null, { status: 401 });
				}

				expect(request.headers.get("cookie")).toContain(
					"_subpilot_session=fresh_session",
				);
				return HttpResponse.json({
					merchantId: "merch_123",
					userId: "user_123",
					email: "hello@acme.test",
					businessName: "Acme Corp",
				} satisfies AuthSessionDto);
			}),
			http.post("https://api.test/v1/auth/refresh", ({ request }) => {
				expect(request.headers.get("cookie")).toContain(
					"_subpilot_refresh=refresh_123",
				);

				return HttpResponse.json(
					{},
					{
						headers: {
							"set-cookie":
								"_subpilot_session=fresh_session; Path=/; HttpOnly; SameSite=Lax",
						},
					},
				);
			}),
		);

		await expect(
			backendRequest<AuthSessionDto>({
				path: "/v1/auth/me",
			}),
		).resolves.toEqual({
			merchantId: "merch_123",
			userId: "user_123",
			email: "hello@acme.test",
			businessName: "Acme Corp",
		});

		expect(meCalls).toBe(2);
	});

	test("refreshes and retries a protected request after a 403", async () => {
		vi.stubEnv("VITE_API_BASE_URL", "https://api.test");
		vi.mocked(getRequestHeader).mockImplementation((name: string) =>
			name === "cookie"
				? "_subpilot_session=stale_session; _subpilot_refresh=refresh_123"
				: undefined,
		);

		let meCalls = 0;

		server.use(
			http.get("https://api.test/v1/auth/me", ({ request }) => {
				meCalls += 1;

				if (meCalls === 1) {
					expect(request.headers.get("cookie")).toContain(
						"_subpilot_session=stale_session",
					);
					return new HttpResponse(null, { status: 403 });
				}

				expect(request.headers.get("cookie")).toContain(
					"_subpilot_session=fresh_session",
				);
				return HttpResponse.json({
					merchantId: "merch_123",
					userId: "user_123",
					email: "hello@acme.test",
					businessName: "Acme Corp",
				} satisfies AuthSessionDto);
			}),
			http.post("https://api.test/v1/auth/refresh", ({ request }) => {
				expect(request.headers.get("cookie")).toContain(
					"_subpilot_refresh=refresh_123",
				);

				return HttpResponse.json(
					{},
					{
						headers: {
							"set-cookie":
								"_subpilot_session=fresh_session; Path=/; HttpOnly; SameSite=Lax",
						},
					},
				);
			}),
		);

		await expect(
			backendRequest<AuthSessionDto>({
				path: "/v1/auth/me",
			}),
		).resolves.toEqual({
			merchantId: "merch_123",
			userId: "user_123",
			email: "hello@acme.test",
			businessName: "Acme Corp",
		});

		expect(meCalls).toBe(2);
	});

	test("forwards every Set-Cookie header from the backend response, not just the last one", async () => {
		vi.stubEnv("VITE_API_BASE_URL", "https://api.test");

		const backendCookies = new Headers();
		backendCookies.append(
			"set-cookie",
			"_subpilot_session=session_abc; Path=/; HttpOnly; SameSite=Lax",
		);
		backendCookies.append(
			"set-cookie",
			"_subpilot_refresh=refresh_abc; Path=/; HttpOnly; SameSite=Lax",
		);
		backendCookies.append(
			"set-cookie",
			"_subpilot_csrf=csrf_abc; Path=/; SameSite=Lax",
		);

		server.use(
			http.post("https://api.test/v1/auth/signup", () => {
				return new HttpResponse(
					JSON.stringify({
						merchantId: "merch_123",
						userId: "user_123",
						email: "hello@acme.test",
						businessName: "Acme Corp",
					} satisfies AuthSessionDto),
					{ headers: backendCookies },
				);
			}),
		);

		await backendRequest<AuthSessionDto>({
			path: "/v1/auth/signup",
			method: "POST",
			body: {
				email: "hello@acme.test",
				password: "secret",
				businessName: "Acme Corp",
			},
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
});
