import { createServerFn } from "@tanstack/react-start";

import { requireSessionCookieMiddleware } from "#/lib/api/backend.ts";
import { internalBackendRequest } from "#/lib/api/internal-backend.ts";
import { internalDashboardSummarySchema } from "#/lib/api/response-schemas.ts";
import type { InternalDashboardSummaryDto } from "#/types/api.ts";

export const getInternalDashboardSummary = createServerFn({ method: "GET" })
	.middleware([requireSessionCookieMiddleware])
	.handler(async () => {
		return internalBackendRequest<InternalDashboardSummaryDto>({
			path: "/v1/internal/dashboard/summary",
			responseSchema: internalDashboardSummarySchema(),
		});
	});
