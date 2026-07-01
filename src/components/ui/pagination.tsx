import {
	CaretLeftIcon,
	CaretRightIcon,
	DotsThreeIcon,
} from "@phosphor-icons/react";
import { createLink, type LinkComponent } from "@tanstack/react-router";
import * as React from "react";
import { Button } from "#/components/ui/button.tsx";
import { cn } from "#/lib/utils.ts";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			aria-label="pagination"
			data-slot="pagination"
			className={cn("mx-auto flex w-full justify-center", className)}
			{...props}
		/>
	);
}

function PaginationContent({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="pagination-content"
			className={cn("flex items-center gap-1", className)}
			{...props}
		/>
	);
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationAnchorProps = {
	isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
	Omit<React.ComponentProps<"a">, "className"> & { className?: string };

const PaginationAnchor = React.forwardRef<
	HTMLAnchorElement,
	PaginationAnchorProps
>(({ className, isActive, size = "icon", ...props }, ref) => (
	<Button
		asChild
		variant={isActive ? "outline" : "ghost"}
		size={size}
		className={cn(className)}
	>
		<a
			ref={ref}
			aria-current={isActive ? "page" : undefined}
			data-slot="pagination-link"
			data-active={isActive}
			{...props}
		/>
	</Button>
));
PaginationAnchor.displayName = "PaginationAnchor";

const CreatedPaginationLink = createLink(PaginationAnchor);

const PaginationLink: LinkComponent<typeof PaginationAnchor> = (props) => {
	return <CreatedPaginationLink preload="intent" {...props} />;
};

type PaginationNavAnchorProps = PaginationAnchorProps & { text?: string };

const PaginationPreviousAnchor = React.forwardRef<
	HTMLAnchorElement,
	PaginationNavAnchorProps
>(({ className, text = "Previous", ...props }, ref) => (
	<PaginationAnchor
		ref={ref}
		aria-label="Go to previous page"
		size="default"
		className={cn("pl-2!", className)}
		{...props}
	>
		<CaretLeftIcon data-icon="inline-start" />
		<span className="hidden sm:block">{text}</span>
	</PaginationAnchor>
));
PaginationPreviousAnchor.displayName = "PaginationPreviousAnchor";

const CreatedPaginationPrevious = createLink(PaginationPreviousAnchor);

const PaginationPrevious: LinkComponent<typeof PaginationPreviousAnchor> = (
	props,
) => {
	return <CreatedPaginationPrevious preload="intent" {...props} />;
};

const PaginationNextAnchor = React.forwardRef<
	HTMLAnchorElement,
	PaginationNavAnchorProps
>(({ className, text = "Next", ...props }, ref) => (
	<PaginationAnchor
		ref={ref}
		aria-label="Go to next page"
		size="default"
		className={cn("pr-2!", className)}
		{...props}
	>
		<span className="hidden sm:block">{text}</span>
		<CaretRightIcon data-icon="inline-end" />
	</PaginationAnchor>
));
PaginationNextAnchor.displayName = "PaginationNextAnchor";

const CreatedPaginationNext = createLink(PaginationNextAnchor);

const PaginationNext: LinkComponent<typeof PaginationNextAnchor> = (props) => {
	return <CreatedPaginationNext preload="intent" {...props} />;
};

function PaginationEllipsis({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			aria-hidden
			data-slot="pagination-ellipsis"
			className={cn(
				"flex size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			<DotsThreeIcon />
			<span className="sr-only">More pages</span>
		</span>
	);
}

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};
