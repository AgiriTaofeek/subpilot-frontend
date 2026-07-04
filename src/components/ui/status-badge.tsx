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
				success: "border-(--success)/20 bg-(--success)/10 text-(--success)",
				warning: "border-(--warning)/20 bg-(--warning)/10 text-(--warning)",
				danger: "border-(--danger)/20 bg-(--danger)/10 text-(--danger)",
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
