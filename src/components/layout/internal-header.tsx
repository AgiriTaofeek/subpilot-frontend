import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { UserMenu } from "#/components/layout/user-menu.tsx";
import ThemeToggle from "#/components/ThemeToggle.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { SidebarTrigger } from "#/components/ui/sidebar.tsx";
import { logoutInternalAdmin } from "#/lib/api/internal-auth.ts";
import type { InternalAdminSessionDto } from "#/types/api.ts";

export function InternalHeader({
	internalAdminSession,
}: {
	internalAdminSession: InternalAdminSessionDto;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	function handleLogout() {
		if (isLoggingOut) return;
		setIsLoggingOut(true);
		toast.promise(
			logoutInternalAdmin().then(async () => {
				queryClient.clear();
				await navigate({ to: "/internal/login" });
			}),
			{
				loading: "Logging out…",
				success: "Logged out",
				error: (error) =>
					error instanceof Error ? error.message : "Couldn't log you out.",
				finally: () => setIsLoggingOut(false),
			},
		);
	}

	return (
		<header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-destructive/20 bg-(--surface-1)/90 px-4 backdrop-blur-xl">
			<SidebarTrigger className="-ml-1 text-(--ink-3) hover:text-(--ink)" />
			<Separator orientation="vertical" className="my-3" />
			<span className="text-sm font-medium text-destructive">
				Internal — staff only
			</span>
			<div className="ml-auto flex items-center gap-2">
				<ThemeToggle />
				<UserMenu
					name={internalAdminSession.displayName}
					subtitle={internalAdminSession.email}
					badge={internalAdminSession.role}
					onLogout={handleLogout}
					isLoggingOut={isLoggingOut}
					tone="destructive"
				/>
			</div>
		</header>
	);
}
