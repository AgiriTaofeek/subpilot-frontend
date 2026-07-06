import { WarningCircleIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert.tsx";
import { restrictedMerchantStatusCopy } from "#/data/plans.ts";
import type { MerchantStatusDto } from "#/types/api.ts";

export function MerchantStatusBanner({
	status,
}: {
	status: MerchantStatusDto;
}) {
	if (status === "active") return null;

	const copy = restrictedMerchantStatusCopy[status];
	const isSuspended = status === "suspended";

	return (
		<div className="px-6 pt-4">
			<Alert
				variant={isSuspended ? "destructive" : "default"}
				className={
					isSuspended ? undefined : "border-amber-500/20 bg-amber-500/5"
				}
			>
				<WarningCircleIcon
					className={isSuspended ? undefined : "text-(--warning)"}
				/>
				<AlertTitle className="text-(--ink)">{copy.title}</AlertTitle>
				<AlertDescription className="text-(--ink-3)">
					{copy.description}
				</AlertDescription>
			</Alert>
		</div>
	);
}
