import { StatusBadge } from "#/components/ui/status-badge.tsx";
import type { HttpMethod } from "#/data/api-docs.ts";

const methodTone: Record<
	HttpMethod,
	"neutral" | "success" | "warning" | "danger"
> = {
	GET: "neutral",
	POST: "success",
	PATCH: "warning",
	DELETE: "danger",
};

export function MethodBadge({ method }: { method: HttpMethod }) {
	return (
		<StatusBadge
			tone={methodTone[method]}
			className="font-heading shrink-0 text-[0.65rem]"
		>
			{method}
		</StatusBadge>
	);
}
