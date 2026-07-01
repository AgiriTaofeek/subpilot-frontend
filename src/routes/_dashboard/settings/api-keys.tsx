import {
	CopyIcon,
	DotsThreeIcon,
	PlusIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SettingsTabs } from "#/components/layout/settings-tabs.tsx";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert.tsx";
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
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { StatusBadge } from "#/components/ui/status-badge.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import {
	type ApiKey,
	generateApiKey,
	apiKeys as initialApiKeys,
} from "#/data/api-keys.ts";

export const Route = createFileRoute("/_dashboard/settings/api-keys")({
	component: SettingsApiKeysPage,
	head: () => ({ meta: [{ title: "API keys | SubPilot" }] }),
});

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function SettingsApiKeysPage() {
	const [keys, setKeys] = useState<ApiKey[]>(initialApiKeys);
	const [createOpen, setCreateOpen] = useState(false);
	const [label, setLabel] = useState("");
	const [newKey, setNewKey] = useState<{ raw: string; label: string } | null>(
		null,
	);
	const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
		"idle",
	);
	const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

	function handleCreate() {
		if (!label.trim()) return;
		const { raw, prefix } = generateApiKey();
		const created: ApiKey = {
			id: `key_${Date.now()}`,
			label: label.trim(),
			prefix,
			status: "active",
			createdAt: new Date().toISOString(),
			lastUsedAt: null,
		};
		setKeys((prev) => [created, ...prev]);
		setLabel("");
		setCreateOpen(false);
		setCopyStatus("idle");
		setNewKey({ raw, label: created.label });
	}

	async function copyRawKey() {
		if (!newKey) return;
		try {
			await navigator.clipboard.writeText(newKey.raw);
			setCopyStatus("copied");
			toast.success("Key copied");
		} catch {
			setCopyStatus("failed");
		}
	}

	function handleRevoke() {
		if (!revokeTarget) return;
		setKeys((prev) =>
			prev.map((k) =>
				k.id === revokeTarget.id ? { ...k, status: "revoked" } : k,
			),
		);
		toast.success("API key revoked");
		setRevokeTarget(null);
	}

	const hasAnyKeys = keys.length > 0;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
						API keys
					</h1>
					<p className="mt-1 max-w-lg text-sm text-(--ink-3)">
						Create keys for server-to-server access. Keep them secret and store
						them in your backend or environment manager.
					</p>
				</div>
				<Button
					onClick={() => setCreateOpen(true)}
					className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
				>
					<PlusIcon data-icon="inline-start" />
					Create API key
				</Button>
			</div>

			<SettingsTabs />

			<Alert className="border-(--line) bg-(--surface-1)">
				<WarningCircleIcon className="text-(--brand)" />
				<AlertTitle className="text-(--ink)">Handle keys carefully</AlertTitle>
				<AlertDescription className="text-(--ink-3)">
					Keys are shown once at creation. Never embed a key in frontend code —
					use it from your backend only. Revoked keys stop working immediately.
				</AlertDescription>
			</Alert>

			{!hasAnyKeys ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No API keys yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Create a key when you are ready to connect a backend service or
							internal tool. Browser apps should never use secret keys directly.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button
							onClick={() => setCreateOpen(true)}
							className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							Create API key
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
					<div className="order-2 lg:order-1">
						{/* Desktop table */}
						<div className="hidden overflow-hidden rounded-2xl border border-(--line) bg-(--surface-1) md:block">
							<Table>
								<TableHeader>
									<TableRow className="border-(--line) hover:bg-transparent">
										<TableHead className="text-(--ink-3)">Prefix</TableHead>
										<TableHead className="text-(--ink-3)">Label</TableHead>
										<TableHead className="text-(--ink-3)">Created</TableHead>
										<TableHead className="text-(--ink-3)">Last used</TableHead>
										<TableHead className="text-(--ink-3)">Status</TableHead>
										<TableHead className="text-(--ink-3)" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{keys.map((key) => (
										<TableRow key={key.id} className="border-(--line)">
											<TableCell className="font-heading text-xs text-(--ink)">
												{key.prefix}****
											</TableCell>
											<TableCell className="text-(--ink-2)">
												{key.label}
											</TableCell>
											<TableCell className="text-(--ink-3)">
												{formatDate(key.createdAt)}
											</TableCell>
											<TableCell className="text-(--ink-3)">
												{key.lastUsedAt ? formatDate(key.lastUsedAt) : "Never"}
											</TableCell>
											<TableCell>
												<StatusBadge
													tone={key.status === "active" ? "success" : "neutral"}
												>
													{key.status === "active" ? "Active" : "Revoked"}
												</StatusBadge>
											</TableCell>
											<TableCell>
												{key.status === "active" && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setRevokeTarget(key)}
														className="text-(--ink-3) hover:text-destructive"
													>
														Revoke
													</Button>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>

						{/* Mobile cards */}
						<div className="flex flex-col gap-3 md:hidden">
							{keys.map((key) => (
								<div
									key={key.id}
									className="flex flex-col gap-2 rounded-2xl border border-(--line) bg-(--surface-1) p-4"
								>
									<div className="flex items-start justify-between gap-2">
										<span className="font-medium text-(--ink)">
											{key.label}
										</span>
										<div className="flex items-center gap-2">
											<StatusBadge
												tone={key.status === "active" ? "success" : "neutral"}
											>
												{key.status === "active" ? "Active" : "Revoked"}
											</StatusBadge>
											{key.status === "active" && (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon-sm"
															className="shrink-0 text-(--ink-3) hover:text-(--ink)"
														>
															<DotsThreeIcon className="size-5" weight="bold" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															variant="destructive"
															onClick={() => setRevokeTarget(key)}
														>
															Revoke
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											)}
										</div>
									</div>
									<div className="font-heading text-xs text-(--ink-2)">
										{key.prefix}****
									</div>
									<div className="text-xs text-(--ink-3)">
										Created {formatDate(key.createdAt)} · Last used{" "}
										{key.lastUsedAt ? formatDate(key.lastUsedAt) : "never"}
									</div>
								</div>
							))}
						</div>
					</div>

					<Card className="order-1 h-fit border border-(--line) bg-(--surface-1) shadow-none lg:order-2">
						<CardHeader>
							<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
								How to use keys safely
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 text-sm text-(--ink-2)">
							<p className="m-0">
								Use this key from your backend, never from browser code.
							</p>
							<p className="m-0">
								Store it in an environment variable or secrets manager.
							</p>
							<p className="m-0">
								Rotate a key by creating a new one and revoking the old one.
							</p>
							<p className="m-0 font-heading text-xs text-(--ink-3)">
								Authorization: Bearer sk_live_****
							</p>
						</CardContent>
					</Card>
				</div>
			)}

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create API key</DialogTitle>
						<DialogDescription>
							Generate a new secret key for server-to-server access.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel
							htmlFor="key-label"
							className="text-sm font-medium text-(--ink-2)"
						>
							Label
						</FieldLabel>
						<Input
							id="key-label"
							placeholder="Production billing worker"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
						/>
						<FieldDescription className="text-(--ink-3)">
							Use a label that identifies where this key will be used, for
							example{" "}
							<span className="font-heading">Production billing worker</span> or{" "}
							<span className="font-heading">Staging integration tests</span>.
						</FieldDescription>
					</Field>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCreateOpen(false)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={!label.trim()}
							className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							Create key
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={newKey !== null}
				onOpenChange={(open) => {
					if (!open) {
						setNewKey(null);
						setCopyStatus("idle");
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>API key created</DialogTitle>
						<DialogDescription>
							Copy this now. You won't see it again.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-2">
						<pre className="select-all rounded-md bg-(--surface-2) p-3 font-heading text-sm break-all text-(--ink)">
							{newKey?.raw}
						</pre>
						<Button
							onClick={copyRawKey}
							className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							<CopyIcon data-icon="inline-start" />
							Copy key
						</Button>
						{copyStatus === "failed" && (
							<p className="text-xs font-medium text-(--warning)">
								Copy manually before closing.
							</p>
						)}
						<p className="text-xs text-(--ink-3)">
							Store it in your server environment, not in browser code.
						</p>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setNewKey(null);
								setCopyStatus("idle");
							}}
							className="w-full border-(--line)"
						>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={revokeTarget !== null}
				onOpenChange={(open) => !open && setRevokeTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Revoke "{revokeTarget?.label}"?</DialogTitle>
						<DialogDescription>
							Requests using this key will stop working immediately.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRevokeTarget(null)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleRevoke}>
							Revoke
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
