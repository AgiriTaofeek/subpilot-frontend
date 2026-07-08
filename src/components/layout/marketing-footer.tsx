import { Link, useLocation } from "@tanstack/react-router";

import { Separator } from "#/components/ui/separator.tsx";

const footerLinks = [
	{ label: "Product", href: "#product" },
	{ label: "How it works", href: "#how-it-works" },
	{ label: "Portal", href: "#portal" },
	{ label: "Webhooks", href: "#webhooks" },
] as const;

export function MarketingFooter() {
	const year = new Date().getFullYear();
	const isHome = useLocation({
		select: (location) => location.pathname === "/",
	});

	return (
		<footer className="site-footer mt-20 px-4 pb-12 pt-8">
			<div className="page-wrap flex flex-col gap-6">
				<div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
					<div className="max-w-md flex flex-col gap-2">
						<p className="island-kicker m-0">SubPilot</p>
						<p className="m-0 text-sm leading-relaxed text-(--ink-2)">
							Recurring billing for teams shipping on Nomba, with plan
							management, proration, dunning, self-serve portal flows, and
							operational webhooks.
						</p>
					</div>

					<div className="flex flex-wrap gap-x-5 gap-y-2">
						{isHome
							? footerLinks.map((link) => (
									<a
										key={link.label}
										href={link.href}
										className="text-sm font-medium text-(--ink-2) no-underline transition hover:text-(--ink)"
									>
										{link.label}
									</a>
								))
							: null}
						<Link
							to="/docs"
							className="text-sm font-medium text-(--ink-2) no-underline transition hover:text-(--ink)"
						>
							API docs
						</Link>
					</div>
				</div>

				<Separator className="bg-(--line)" />

				<div className="text-sm text-(--ink-2)">
					<p className="m-0">
						&copy; {year} SubPilot. Built for operational clarity.
					</p>
				</div>
			</div>
		</footer>
	);
}
