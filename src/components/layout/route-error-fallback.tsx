import { WarningCircleIcon } from "@phosphor-icons/react";

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty.tsx";

export function RouteErrorFallback({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action: React.ReactNode;
}) {
	return (
		<div className="flex flex-1 items-center justify-center p-10">
			<Empty className="max-w-sm rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
				<EmptyHeader>
					<EmptyMedia
						variant="icon"
						className="rounded-full bg-destructive/10 text-destructive"
					>
						<WarningCircleIcon />
					</EmptyMedia>
					<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
						{title}
					</EmptyTitle>
					<EmptyDescription className="text-(--ink-3)">
						{description}
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>{action}</EmptyContent>
			</Empty>
		</div>
	);
}
