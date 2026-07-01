import { createFileRoute, Outlet } from "@tanstack/react-router";

import { merchantDisplayName, resolvePortalToken } from "#/data/portal.ts";

export const Route = createFileRoute("/portal/$token")({
	component: PortalLayout,
	head: () => ({ meta: [{ title: "Customer portal | SubPilot" }] }),
});

function PortalLayout() {
	const { token } = Route.useParams();
	const context = resolvePortalToken(token);

	if (!context) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-(--surface) px-4">
				<div className="max-w-sm flex flex-col gap-2 rounded-2xl border border-(--line) bg-(--surface-1) p-8 text-center shadow-sm">
					<h1 className="text-lg font-semibold tracking-tight text-(--ink)">
						This link is no longer valid
					</h1>
					<p className="text-sm text-(--ink-3)">
						Please contact the business to get an updated link.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col bg-(--surface)">
			<header className="border-b border-(--line) px-4 py-4">
				<div className="mx-auto flex max-w-xl items-center gap-2">
					<span className="text-sm font-semibold tracking-tight text-(--ink)">
						{merchantDisplayName}
					</span>
					<span className="text-(--ink-3)">·</span>
					<span className="font-heading text-[0.65rem] tracking-wide text-(--ink-3) uppercase">
						Customer portal
					</span>
				</div>
			</header>
			<main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
				<Outlet />
			</main>
		</div>
	);
}
