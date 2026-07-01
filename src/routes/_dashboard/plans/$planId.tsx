import { CopyIcon, DotsThreeIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import {
	checkoutUrl,
	formatInterval,
	type Plan,
	plans,
	prorationLabels,
	statusTone,
} from "#/data/plans.ts";
import { formatNGN } from "#/lib/currency.ts";

export const Route = createFileRoute("/_dashboard/plans/$planId")({
	component: PlanDetailPage,
	head: () => ({ meta: [{ title: "Plan | SubPilot" }] }),
});

function PlanDetailPage() {
	const { planId } = Route.useParams();
	const [plan, setPlan] = useState<Plan | undefined>(() =>
		plans.find((p) => p.id === planId),
	);
	const [isEditing, setIsEditing] = useState(false);
	const [editName, setEditName] = useState(plan?.name ?? "");
	const [editDescription, setEditDescription] = useState(
		plan?.description ?? "",
	);
	const [editTrialDays, setEditTrialDays] = useState(plan?.trialDays ?? 0);
	const [publishDialogOpen, setPublishDialogOpen] = useState(false);
	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

	if (!plan) {
		return (
			<div className="flex flex-1 items-center justify-center p-10">
				<Empty className="max-w-sm rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							Plan not found
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							This plan may have been removed or the link is incorrect.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild variant="outline" className="border-(--line)">
							<Link to="/plans">Back to plans</Link>
						</Button>
					</EmptyContent>
				</Empty>
			</div>
		);
	}

	const primaryAction =
		plan.status === "draft"
			? "publish"
			: plan.status === "published"
				? "archive"
				: null;

	// TODO: replace with a real count once the subscriptions data model exists.
	const activeSubscriptionCount = plan.status === "published" ? 4 : 0;

	function startEdit() {
		if (!plan) return;
		setEditName(plan.name);
		setEditDescription(plan.description ?? "");
		setEditTrialDays(plan.trialDays);
		setIsEditing(true);
	}

	function saveEdit() {
		setPlan((prev) =>
			prev
				? {
						...prev,
						name: editName.trim() || prev.name,
						description: editDescription,
						trialDays: prev.status === "draft" ? editTrialDays : prev.trialDays,
					}
				: prev,
		);
		setIsEditing(false);
		toast.success("Plan updated");
	}

	function handlePublish() {
		setPlan((prev) => (prev ? { ...prev, status: "published" } : prev));
		setPublishDialogOpen(false);
		toast.success("Plan published");
	}

	function handleArchive() {
		setPlan((prev) => (prev ? { ...prev, status: "archived" } : prev));
		setArchiveDialogOpen(false);
		toast.success("Plan archived");
	}

	async function handleCopyUrl() {
		if (!plan) return;
		const url = `${window.location.origin}${checkoutUrl(plan)}`;
		await navigator.clipboard.writeText(url);
		toast.success("Checkout link copied", { duration: 2000 });
	}

	return (
		<div className="p-6 pb-24 sm:pb-6">
			<div className="flex flex-col gap-4 border-b border-(--line) pb-6 sm:flex-row sm:items-start sm:justify-between">
				<div className="max-w-lg flex flex-col gap-2">
					{isEditing ? (
						<>
							<Input
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
								className="border-(--line) bg-(--surface) px-3 text-lg font-semibold"
							/>
							<Textarea
								value={editDescription}
								onChange={(e) => setEditDescription(e.target.value)}
								rows={2}
								placeholder="Description (optional)"
								className="rounded-md border-(--line) bg-(--surface) px-3 py-2 text-sm"
							/>
							<div className="flex gap-2 pt-1">
								<Button
									size="sm"
									onClick={saveEdit}
									className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
								>
									Save
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setIsEditing(false)}
									className="border-(--line)"
								>
									Cancel
								</Button>
							</div>
						</>
					) : (
						<>
							<div className="flex flex-wrap items-center gap-3">
								<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
									{plan.name}
								</h1>
								<StatusBadge tone={statusTone[plan.status]}>
									{plan.status}
								</StatusBadge>
							</div>
							{plan.description && (
								<p className="text-sm text-(--ink-3)">{plan.description}</p>
							)}
						</>
					)}
				</div>

				{!isEditing && (
					<div className="hidden items-center gap-2 sm:flex">
						{primaryAction === "publish" && (
							<Button
								onClick={() => setPublishDialogOpen(true)}
								className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
							>
								Publish
							</Button>
						)}
						{primaryAction === "archive" && (
							<Button
								onClick={() => setArchiveDialogOpen(true)}
								variant="outline"
								className="border-(--line)"
							>
								Archive
							</Button>
						)}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="icon-sm"
									className="border-(--line)"
								>
									<DotsThreeIcon className="size-5" weight="bold" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={startEdit}>Edit</DropdownMenuItem>
								{plan.status === "draft" && (
									<DropdownMenuItem
										variant="destructive"
										onClick={() => setArchiveDialogOpen(true)}
									>
										Archive
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}
			</div>

			<div className="grid gap-6 pt-6 lg:grid-cols-[1.4fr_1fr]">
				<Card className="order-2 border border-(--line) bg-(--surface-1) shadow-none lg:order-1">
					<CardHeader>
						<CardTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							Plan terms
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
							<div>
								<p className="island-kicker m-0">Price</p>
								<p className="mt-1 text-base font-semibold text-(--ink)">
									{formatNGN(plan.amountKobo)}
								</p>
							</div>
							<div>
								<p className="island-kicker m-0">Interval</p>
								<p className="mt-1 text-base font-semibold text-(--ink)">
									{formatInterval(plan.interval)}
								</p>
							</div>
							<div>
								<p className="island-kicker m-0">Trial</p>
								{isEditing && plan.status === "draft" ? (
									<Input
										type="number"
										min={0}
										value={editTrialDays}
										onChange={(e) =>
											setEditTrialDays(Math.max(0, Number(e.target.value) || 0))
										}
										className="mt-1 w-24 border-(--line) bg-(--surface) px-2 py-1 text-sm"
									/>
								) : (
									<p className="mt-1 text-base font-semibold text-(--ink)">
										{plan.trialDays > 0 ? `${plan.trialDays} days` : "None"}
									</p>
								)}
							</div>
						</div>

						<Separator className="bg-(--line)" />

						<div>
							<p className="island-kicker m-0">Proration policy</p>
							<p className="mt-1 text-sm text-(--ink-2)">
								{prorationLabels[plan.proration]}
							</p>
						</div>

						<Separator className="bg-(--line)" />

						<p className="text-sm text-(--ink-2)">
							{activeSubscriptionCount > 0 ? (
								<a
									href={`/subscriptions?planId=${plan.id}`}
									className="font-medium text-(--brand) hover:underline"
								>
									{activeSubscriptionCount} active subscriptions
								</a>
							) : (
								"No active subscriptions."
							)}
						</p>
					</CardContent>
				</Card>

				{plan.status === "published" && (
					<div className="order-1 flex flex-col gap-4 lg:order-2">
						<Card className="border border-(--line) bg-(--surface-1) shadow-none">
							<CardHeader>
								<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
									Hosted checkout URL
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-2 rounded-md border border-(--line) bg-(--surface) px-3 py-2">
									<span className="flex-1 truncate font-heading text-xs text-(--ink-2)">
										{checkoutUrl(plan)}
									</span>
									<Button
										size="icon-sm"
										variant="ghost"
										onClick={handleCopyUrl}
										className="shrink-0 text-(--ink-3) hover:text-(--ink)"
									>
										<CopyIcon className="size-4" />
									</Button>
								</div>
							</CardContent>
						</Card>

						<Card className="border border-(--line) bg-(--surface-1) shadow-none">
							<CardHeader>
								<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
									Share instructions
								</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-2 text-sm text-(--ink-2)">
								<p className="m-0">
									Share this link directly with customers, or embed it in your
									website, invoices, or emails.
								</p>
								<p className="m-0">
									Anyone with the link can subscribe — no account required on
									their end.
								</p>
							</CardContent>
						</Card>
					</div>
				)}
			</div>

			{primaryAction === "publish" && !isEditing && (
				<div className="fixed inset-x-0 bottom-0 z-40 border-t border-(--line) bg-(--surface-1) p-4 sm:hidden">
					<Button
						onClick={() => setPublishDialogOpen(true)}
						className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
					>
						Publish
					</Button>
				</div>
			)}

			<Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Publish this plan?</DialogTitle>
						<DialogDescription>
							Once published, your plan is live at its checkout link. Amount and
							billing interval cannot be changed after publishing.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setPublishDialogOpen(false)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							onClick={handlePublish}
							className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							Publish
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Archive this plan?</DialogTitle>
						<DialogDescription>
							Archived plans cannot receive new subscribers. Existing
							subscriptions are not affected.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setArchiveDialogOpen(false)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleArchive}>
							Archive
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
