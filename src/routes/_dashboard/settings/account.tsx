import { CopyIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { SettingsTabs } from "#/components/layout/settings-tabs.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { Input } from "#/components/ui/input.tsx";
import { account } from "#/data/account.ts";
import { merchantSlug } from "#/data/plans.ts";

export const Route = createFileRoute("/_dashboard/settings/account")({
	component: SettingsAccountPage,
	head: () => ({ meta: [{ title: "Account | SubPilot" }] }),
});

async function copySlugPrefix() {
	await navigator.clipboard.writeText(`/pay/${merchantSlug}/`);
	toast.success("Checkout link prefix copied", { duration: 2000 });
}

function SettingsAccountPage() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Account
			</h1>

			<SettingsTabs />

			<div className="max-w-xl flex flex-col gap-4">
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardHeader>
						<CardTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							Profile
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<p className="text-sm font-medium text-(--ink-2)">
								Business name
							</p>
							<Input
								value={account.businessName}
								readOnly
								className="border-(--line) bg-(--surface) px-3 text-(--ink-3)"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<p className="text-sm font-medium text-(--ink-2)">Email</p>
							<Input
								value={account.email}
								readOnly
								className="border-(--line) bg-(--surface) px-3 text-(--ink-3)"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<p className="text-sm font-medium text-(--ink-2)">
								Merchant slug
							</p>
							<p className="m-0 text-xs text-(--ink-3)">
								Your checkout links use this slug:
							</p>
							<div className="flex items-center gap-2 rounded-md border border-(--line) bg-(--surface) px-3 py-2">
								<span className="flex-1 truncate font-heading text-xs text-(--ink-2)">
									/pay/{merchantSlug}/
								</span>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={copySlugPrefix}
									className="shrink-0 text-(--ink-3) hover:text-(--ink)"
								>
									<CopyIcon className="size-4" />
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardHeader>
						<CardTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							Security
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="m-0 text-sm text-(--ink-3)">
							Password change is not available in v1.
						</p>
					</CardContent>
				</Card>

				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardHeader>
						<CardTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							Danger Zone
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="m-0 text-sm text-(--ink-3)">
							Account deletion is not available in v1. Contact support to close
							your account.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
