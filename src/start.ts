import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from "@tanstack/react-start";

// Defining requestMiddleware here REPLACES Start's built-in default (a
// same-origin check scoped to server function calls) rather than adding to
// it, so it has to be listed explicitly alongside our own middleware or
// server functions lose CSRF protection with no error, just a dev console
// warning.
const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
});

// No Content-Security-Policy yet: the root shell's inline theme-init script
// (src/routes/__root.tsx) and Radix/shadcn's inline style attributes would
// need a CSP pass of their own (nonces or unsafe-inline carve-outs) to not
// break under a strict policy — deliberately out of scope here.
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
	const result = await next();
	const response = new Response(result.response.body, result.response);

	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=()",
	);
	response.headers.set(
		"Strict-Transport-Security",
		"max-age=63072000; includeSubDomains",
	);

	return { ...result, response };
});

export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware, securityHeadersMiddleware],
}));
