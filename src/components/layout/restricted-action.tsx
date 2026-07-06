import { Button } from "#/components/ui/button.tsx";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip.tsx";
import { restrictedMerchantStatusCopy } from "#/data/plans.ts";
import type { MerchantStatusDto } from "#/types/api.ts";

/**
 * Gates a write action (open a create/publish dialog, follow a create-plan
 * link, ...) behind merchant status. When active, renders `children`
 * untouched — including whatever Dialog/Sheet/Link trigger it wraps. When
 * not, swaps the whole thing for a standalone disabled button + tooltip
 * instead of trying to disable the real trigger in place: a disabled
 * Button has pointer-events-none (so a Tooltip on it would never open on
 * hover), and nesting this Tooltip inside another component's own
 * `asChild` trigger (e.g. SheetTrigger) risks two Radix Slots fighting
 * over the same child. Swapping the subtree entirely avoids both.
 */
export function RestrictedAction({
	status,
	triggerClassName,
	triggerChildren,
	children,
}: {
	status: MerchantStatusDto;
	triggerClassName?: string;
	triggerChildren: React.ReactNode;
	children: React.ReactNode;
}) {
	if (status === "active") {
		return <>{children}</>;
	}

	const { reason } = restrictedMerchantStatusCopy[status];

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				{/* biome-ignore lint/a11y/noNoninteractiveTabindex: makes the wrapper hover/focus-reachable so the tooltip on the disabled Button inside it is actually discoverable. */}
				<span tabIndex={0} className="inline-flex">
					<Button disabled className={triggerClassName}>
						{triggerChildren}
					</Button>
				</span>
			</TooltipTrigger>
			<TooltipContent>{reason}</TooltipContent>
		</Tooltip>
	);
}
