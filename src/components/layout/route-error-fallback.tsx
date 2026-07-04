import { WarningCircleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { Button } from "#/components/ui/button.tsx";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty.tsx";

export function SessionExpiredFallback() {
	return (
		<RouteErrorFallback
			title="Your session has expired"
			description="Please log in again to continue."
			action={
				<Button
					asChild
					className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
				>
					<Link to="/auth/login">Log in</Link>
				</Button>
			}
		/>
	);
}

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
