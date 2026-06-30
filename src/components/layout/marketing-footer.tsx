import { GithubLogoIcon, XLogoIcon } from "@phosphor-icons/react";

import { Separator } from "#/components/ui/separator.tsx";

const footerLinks = [
	{ label: "Product", href: "#product" },
	{ label: "How it works", href: "#how-it-works" },
	{ label: "Portal", href: "#portal" },
	{ label: "Webhooks", href: "#webhooks" },
] as const;

export default function MarketingFooter() {
	const year = new Date().getFullYear();

	return (
		<footer className="site-footer mt-20 px-4 pb-12 pt-8">
			<div className="page-wrap space-y-6">
				<div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
					<div className="max-w-md space-y-2">
						<p className="island-kicker m-0">SubPilot</p>
						<p className="m-0 text-sm leading-relaxed text-(--sea-ink-soft)">
							Recurring billing for teams shipping on Nomba, with plan
							management, proration, dunning, self-serve portal flows, and
							operational webhooks.
						</p>
					</div>

					<div className="flex flex-wrap gap-x-5 gap-y-2">
						{footerLinks.map((link) => (
							<a
								key={link.label}
								href={link.href}
								className="text-sm font-medium text-(--sea-ink-soft) no-underline transition hover:text-(--sea-ink)"
							>
								{link.label}
							</a>
						))}
					</div>
				</div>

				<Separator className="bg-(--line)" />

				<div className="flex flex-col gap-4 text-sm text-(--sea-ink-soft) sm:flex-row sm:items-center sm:justify-between">
					<p className="m-0">
						&copy; {year} SubPilot. Built for operational clarity.
					</p>

					<div className="flex items-center gap-3">
						<a
							href="https://github.com"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-2 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5 text-(--sea-ink) no-underline shadow-[0_8px_22px_rgba(30,90,72,0.08)]"
						>
							<GithubLogoIcon className="size-4" />
							GitHub
						</a>
						<a
							href="https://x.com"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-2 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5 text-(--sea-ink) no-underline shadow-[0_8px_22px_rgba(30,90,72,0.08)]"
						>
							<XLogoIcon className="size-4" />X
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
