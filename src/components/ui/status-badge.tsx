import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "#/components/ui/badge.tsx";
import { cn } from "#/lib/utils.ts";

const statusBadgeVariants = cva(
	"rounded-full border px-2.5 py-1 text-[0.65rem] normal-case tracking-wide",
	{
		variants: {
			tone: {
				neutral: "border-(--line) bg-(--surface-2) text-(--ink-2)",
				brand: "border-(--brand)/20 bg-(--brand)/10 text-(--brand)",
				success: "border-emerald-500/20 bg-emerald-500/10 text-(--success)",
				warning: "border-amber-500/20 bg-amber-500/10 text-(--warning)",
				danger: "border-red-500/20 bg-red-500/10 text-(--danger)",
			},
		},
		defaultVariants: {
			tone: "neutral",
		},
	},
);

function StatusBadge({
	className,
	tone,
	...props
}: React.ComponentProps<typeof Badge> &
	VariantProps<typeof statusBadgeVariants>) {
	return (
		<Badge
			variant="outline"
			data-tone={tone}
			className={cn(statusBadgeVariants({ tone }), className)}
			{...props}
		/>
	);
}

export { StatusBadge, statusBadgeVariants };
