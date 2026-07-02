import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

export const server = setupServer();

// Backs the mocked getResponseHeaders() below with a real Headers instance
// so tests can assert on accumulated response headers (e.g. multiple
// Set-Cookie entries) the same way the real h3/nitro response object
// would behave. Reset per-test in beforeEach.
export let mockResponseHeaders = new Headers();

vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeader: vi.fn(),
	setResponseHeader: vi.fn(),
	setResponseStatus: vi.fn(),
	getResponseHeaders: vi.fn(() => mockResponseHeaders),
}));

beforeAll(() => {
	server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
	mockResponseHeaders = new Headers();
});

afterEach(() => {
	server.resetHandlers();
	vi.unstubAllEnvs();
	vi.clearAllMocks();
});

afterAll(() => {
	server.close();
});
