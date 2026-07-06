import { GearIcon, SignOutIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { Avatar, AvatarFallback } from "#/components/ui/avatar.tsx";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { cn } from "#/lib/utils.ts";

export function UserMenu({
	name,
	subtitle,
	badge,
	accountHref,
	onLogout,
	isLoggingOut,
	tone = "brand",
}: {
	name: string;
	subtitle: string;
	badge?: string;
	accountHref?: string;
	onLogout: () => void;
	isLoggingOut: boolean;
	tone?: "brand" | "destructive";
}) {
	const initials = name.charAt(0).toUpperCase();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Open user menu"
					className={cn(
						"flex items-center rounded-full p-0.5 outline-none hover:bg-(--surface-2)",
						"focus-visible:ring-2 focus-visible:ring-ring/30",
					)}
				>
					<Avatar>
						<AvatarFallback
							className={
								tone === "destructive"
									? "bg-destructive/15 text-destructive"
									: "bg-(--brand)/15 text-(--brand)"
							}
						>
							{initials}
						</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="flex flex-col gap-1 normal-case tracking-normal">
					<span className="flex items-center gap-2">
						<span className="truncate text-sm font-medium text-foreground">
							{name}
						</span>
						{badge ? (
							<span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground">
								{badge}
							</span>
						) : null}
					</span>
					<span className="truncate text-xs font-normal text-muted-foreground">
						{subtitle}
					</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{accountHref ? (
					<DropdownMenuItem asChild>
						<Link to={accountHref}>
							<GearIcon />
							Account settings
						</Link>
					</DropdownMenuItem>
				) : null}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					variant="destructive"
					disabled={isLoggingOut}
					onSelect={() => onLogout()}
				>
					{isLoggingOut ? <Spinner /> : <SignOutIcon />}
					{isLoggingOut ? "Logging out…" : "Log out"}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
