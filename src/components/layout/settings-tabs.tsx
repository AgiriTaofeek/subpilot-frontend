import { Link, useRouterState } from "@tanstack/react-router";

const settingsTabs = [
	{ label: "Account", href: "/settings/account" },
	{ label: "API keys", href: "/settings/api-keys" },
	{ label: "Dunning", href: "/settings/dunning" },
	{ label: "Audit log", href: "/settings/audit-log" },
] as const;

export function SettingsTabs() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	return (
		<div className="flex gap-4 border-b border-(--line)">
			{settingsTabs.map((tab) => {
				const isActive = pathname === tab.href;
				return (
					<Link
						key={tab.href}
						to={tab.href}
						className={`border-b-2 pb-3 text-sm font-medium no-underline transition-colors ${
							isActive
								? "border-(--brand) text-(--ink)"
								: "border-transparent text-(--ink-3) hover:text-(--ink-2)"
						}`}
					>
						{tab.label}
					</Link>
				);
			})}
		</div>
	);
}
