import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
	beforeLoad: ({ location }) => {
		if (location.pathname === "/auth" || location.pathname === "/auth/") {
			throw redirect({ to: "/auth/login" });
		}
	},
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<div className="flex min-h-screen flex-col bg-(--surface)">
			<div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
				<Link
					to="/"
					className="mb-8 inline-flex items-center gap-3 text-(--ink) no-underline"
				>
					<span className="inline-flex size-8 items-center justify-center rounded-full border border-(--brand)/25 bg-(--brand)/10">
						<span className="size-2.5 rounded-full bg-(--brand)" />
					</span>
					<span className="text-base font-semibold tracking-tight">
						SubPilot
					</span>
				</Link>

				<main className="flex w-full justify-center">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
