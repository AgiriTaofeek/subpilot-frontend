import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

export const server = setupServer();

vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeader: vi.fn(),
	setResponseHeader: vi.fn(),
	setResponseStatus: vi.fn(),
}));

beforeAll(() => {
	server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
	server.resetHandlers();
	vi.unstubAllEnvs();
	vi.clearAllMocks();
});

afterAll(() => {
	server.close();
});
