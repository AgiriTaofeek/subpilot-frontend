import { DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SettingsTabs } from "#/components/layout/settings-tabs.tsx";
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
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
import { Field, FieldContent, FieldLabel } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { Switch } from "#/components/ui/switch.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import {
	dunningCampaignsQueryOptions,
	dunningEmailTemplateLabel,
	dunningStepActionLabel,
} from "#/data/dunning.ts";
import { useHandleMutationError } from "#/hooks/use-handle-mutation-error.ts";
import {
	addDunningStep,
	deleteDunningStep,
	updateDunningCampaign,
	updateDunningStep,
} from "#/lib/api/dunning.ts";
import { formatDate } from "#/lib/date.ts";
import type {
	DunningCampaignDto,
	DunningEmailTemplateDto,
	DunningStepActionDto,
	DunningStepDto,
} from "#/types/api.ts";

export const Route = createFileRoute("/_dashboard/settings/dunning")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(dunningCampaignsQueryOptions());
	},
	component: SettingsDunningPage,
	head: () => ({ meta: [{ title: "Dunning | SubPilot" }] }),
});

const stepActions: DunningStepActionDto[] = [
	"retry_charge",
	"send_email",
	"both",
];
const emailTemplates: DunningEmailTemplateDto[] = [
	"payment_failed",
	"final_warning",
	"service_suspended",
];

function needsEmailTemplate(action: DunningStepActionDto): boolean {
	return action === "send_email" || action === "both";
}

interface StepFormValue {
	dayOffset: string;
	action: DunningStepActionDto;
	emailTemplate: DunningEmailTemplateDto | "";
}

function CampaignSettingsCard({ campaign }: { campaign: DunningCampaignDto }) {
	const queryClient = useQueryClient();
	const [name, setName] = useState(campaign.name);
	const [gracePeriodDays, setGracePeriodDays] = useState(
		String(campaign.gracePeriodDays),
	);
	const [maxAttempts, setMaxAttempts] = useState(String(campaign.maxAttempts));
	const [cancelAfterExhaustion, setCancelAfterExhaustion] = useState(
		campaign.cancelAfterExhaustion,
	);
	const handleMutationError = useHandleMutationError();

	const updateMutation = useMutation({
		mutationFn: () =>
			updateDunningCampaign({
				data: {
					campaignId: campaign.id,
					name,
					gracePeriodDays: Number(gracePeriodDays),
					maxAttempts: Number(maxAttempts),
					cancelAfterExhaustion,
				},
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["dunning-campaigns"] });
			toast.success("Dunning settings saved");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't save settings.",
			}),
	});

	return (
		<Card className="border border-(--line) bg-(--surface-1) shadow-none">
			<CardHeader>
				<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
					Retry policy
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Field>
					<FieldLabel
						htmlFor="campaign-name"
						className="text-sm font-medium text-(--ink-2)"
					>
						Campaign name
					</FieldLabel>
					<Input
						id="campaign-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={100}
						className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
					/>
				</Field>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel
							htmlFor="grace-period"
							className="text-sm font-medium text-(--ink-2)"
						>
							Grace period (days)
						</FieldLabel>
						<Input
							id="grace-period"
							type="number"
							min={1}
							max={90}
							value={gracePeriodDays}
							onChange={(e) => setGracePeriodDays(e.target.value)}
							className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
						/>
					</Field>
					<Field>
						<FieldLabel
							htmlFor="max-attempts"
							className="text-sm font-medium text-(--ink-2)"
						>
							Max attempts
						</FieldLabel>
						<Input
							id="max-attempts"
							type="number"
							min={1}
							max={10}
							value={maxAttempts}
							onChange={(e) => setMaxAttempts(e.target.value)}
							className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
						/>
					</Field>
				</div>
				<Field orientation="horizontal">
					<Switch
						checked={cancelAfterExhaustion}
						onCheckedChange={setCancelAfterExhaustion}
					/>
					<FieldContent>
						<span className="text-sm font-medium text-(--ink)">
							Cancel subscription after exhaustion
						</span>
						<span className="text-xs text-(--ink-3)">
							When every step in the campaign has run and payment still hasn't
							recovered, cancel the subscription automatically.
						</span>
					</FieldContent>
				</Field>
				<Button
					onClick={() => updateMutation.mutate()}
					disabled={updateMutation.isPending}
					className="w-fit border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
				>
					{updateMutation.isPending ? (
						<>
							<Spinner data-icon="inline-start" />
							Saving…
						</>
					) : (
						"Save changes"
					)}
				</Button>
			</CardContent>
		</Card>
	);
}

function SettingsDunningPage() {
	const queryClient = useQueryClient();
	const { data: campaigns } = useSuspenseQuery(dunningCampaignsQueryOptions());
	const campaign = campaigns.find((c) => c.isDefault) ?? campaigns[0] ?? null;

	const [stepDialogOpen, setStepDialogOpen] = useState(false);
	const [editingStep, setEditingStep] = useState<DunningStepDto | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<DunningStepDto | null>(null);
	const [stepForm, setStepForm] = useState<StepFormValue>({
		dayOffset: "0",
		action: "retry_charge",
		emailTemplate: "",
	});
	const handleMutationError = useHandleMutationError();

	const addStepMutation = useMutation({
		mutationFn: (value: StepFormValue) => {
			if (!campaign) throw new Error("No campaign");
			return addDunningStep({
				data: {
					campaignId: campaign.id,
					dayOffset: Number(value.dayOffset),
					action: value.action,
					emailTemplate: value.emailTemplate || undefined,
				},
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["dunning-campaigns"] });
			setStepDialogOpen(false);
			toast.success("Step added");
		},
		onError: (error) =>
			handleMutationError(error, { fallbackMessage: "Couldn't add the step." }),
	});

	const updateStepMutation = useMutation({
		mutationFn: (value: StepFormValue) => {
			if (!campaign || !editingStep) throw new Error("No step selected");
			return updateDunningStep({
				data: {
					campaignId: campaign.id,
					stepId: editingStep.id,
					dayOffset: Number(value.dayOffset),
					action: value.action,
					emailTemplate: value.emailTemplate || null,
				},
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["dunning-campaigns"] });
			setStepDialogOpen(false);
			setEditingStep(null);
			toast.success("Step updated");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't update the step.",
			}),
	});

	const deleteStepMutation = useMutation({
		mutationFn: () => {
			if (!campaign || !deleteTarget) throw new Error("No step selected");
			return deleteDunningStep({
				data: { campaignId: campaign.id, stepId: deleteTarget.id },
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["dunning-campaigns"] });
			setDeleteTarget(null);
			toast.success("Step deleted");
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't delete the step.",
			}),
	});

	function openAddStep() {
		setEditingStep(null);
		setStepForm({ dayOffset: "0", action: "retry_charge", emailTemplate: "" });
		setStepDialogOpen(true);
	}

	function openEditStep(step: DunningStepDto) {
		setEditingStep(step);
		setStepForm({
			dayOffset: String(step.dayOffset),
			action: step.action,
			emailTemplate: step.emailTemplate ?? "",
		});
		setStepDialogOpen(true);
	}

	function handleStepSubmit() {
		if (editingStep) {
			updateStepMutation.mutate(stepForm);
		} else {
			addStepMutation.mutate(stepForm);
		}
	}

	const sortedSteps = campaign
		? [...campaign.steps].sort((a, b) => a.dayOffset - b.dayOffset)
		: [];

	const stepMutationPending =
		addStepMutation.isPending || updateStepMutation.isPending;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
				Dunning
			</h1>

			<SettingsTabs />

			{!campaign ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No dunning campaign yet
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							SubPilot creates a default retry campaign automatically the first
							time a payment fails.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="max-w-2xl flex flex-col gap-4">
					<CampaignSettingsCard campaign={campaign} />

					<Card className="border border-(--line) bg-(--surface-1) shadow-none">
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle className="font-sans text-base normal-case tracking-tight text-(--ink)">
								Steps
							</CardTitle>
							<Button
								variant="outline"
								size="sm"
								onClick={openAddStep}
								className="border-(--line)"
							>
								<PlusIcon data-icon="inline-start" />
								Add step
							</Button>
						</CardHeader>
						<CardContent>
							{sortedSteps.length === 0 ? (
								<p className="m-0 text-sm text-(--ink-3)">
									No steps configured yet.
								</p>
							) : (
								<div className="overflow-hidden rounded-md border border-(--line)">
									<Table>
										<TableHeader>
											<TableRow className="border-(--line) hover:bg-transparent">
												<TableHead className="text-(--ink-3)">
													Day offset
												</TableHead>
												<TableHead className="text-(--ink-3)">Action</TableHead>
												<TableHead className="text-(--ink-3)">
													Email template
												</TableHead>
												<TableHead className="text-(--ink-3)" />
											</TableRow>
										</TableHeader>
										<TableBody>
											{sortedSteps.map((step) => (
												<TableRow key={step.id} className="border-(--line)">
													<TableCell className="text-(--ink)">
														Day {step.dayOffset}
													</TableCell>
													<TableCell className="text-(--ink-2)">
														{dunningStepActionLabel[step.action]}
													</TableCell>
													<TableCell className="text-(--ink-2)">
														{step.emailTemplate
															? dunningEmailTemplateLabel[step.emailTemplate]
															: "—"}
													</TableCell>
													<TableCell>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon-sm"
																	aria-label="Step actions"
																	className="text-(--ink-3) hover:text-(--ink)"
																>
																	<DotsThreeIcon
																		className="size-5"
																		weight="bold"
																	/>
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem
																	onClick={() => openEditStep(step)}
																>
																	Edit
																</DropdownMenuItem>
																<DropdownMenuItem
																	variant="destructive"
																	onClick={() => setDeleteTarget(step)}
																>
																	Delete
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
							<p className="mt-3 text-xs text-(--ink-3)">
								Campaign created {formatDate(campaign.createdAt)}.
							</p>
						</CardContent>
					</Card>
				</div>
			)}

			<Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{editingStep ? "Edit step" : "Add step"}</DialogTitle>
						<DialogDescription>
							Steps run in order of day offset after a payment first fails.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<Field>
							<FieldLabel
								htmlFor="step-day-offset"
								className="text-sm font-medium text-(--ink-2)"
							>
								Day offset
							</FieldLabel>
							<Input
								id="step-day-offset"
								type="number"
								min={0}
								max={90}
								value={stepForm.dayOffset}
								onChange={(e) =>
									setStepForm((prev) => ({
										...prev,
										dayOffset: e.target.value,
									}))
								}
								className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
							/>
						</Field>
						<Field>
							<FieldLabel className="text-sm font-medium text-(--ink-2)">
								Action
							</FieldLabel>
							<Select
								value={stepForm.action}
								onValueChange={(value) =>
									setStepForm((prev) => ({
										...prev,
										action: value as DunningStepActionDto,
									}))
								}
							>
								<SelectTrigger className="w-full rounded-md border-(--line) bg-(--surface) px-3">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{stepActions.map((action) => (
										<SelectItem key={action} value={action}>
											{dunningStepActionLabel[action]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
						{needsEmailTemplate(stepForm.action) && (
							<Field>
								<FieldLabel className="text-sm font-medium text-(--ink-2)">
									Email template
								</FieldLabel>
								<Select
									value={stepForm.emailTemplate}
									onValueChange={(value) =>
										setStepForm((prev) => ({
											...prev,
											emailTemplate: value as DunningEmailTemplateDto,
										}))
									}
								>
									<SelectTrigger className="w-full rounded-md border-(--line) bg-(--surface) px-3">
										<SelectValue placeholder="Select a template" />
									</SelectTrigger>
									<SelectContent>
										{emailTemplates.map((template) => (
											<SelectItem key={template} value={template}>
												{dunningEmailTemplateLabel[template]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setStepDialogOpen(false)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							onClick={handleStepSubmit}
							disabled={
								stepMutationPending ||
								(needsEmailTemplate(stepForm.action) && !stepForm.emailTemplate)
							}
							className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							{stepMutationPending ? (
								<>
									<Spinner data-icon="inline-start" />
									{editingStep ? "Saving…" : "Adding…"}
								</>
							) : editingStep ? (
								"Save changes"
							) : (
								"Add step"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={deleteTarget !== null}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete this step?</DialogTitle>
						<DialogDescription>
							This step will no longer run for future dunning campaigns.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteTarget(null)}
							className="border-(--line)"
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => deleteStepMutation.mutate()}
							disabled={deleteStepMutation.isPending}
						>
							{deleteStepMutation.isPending ? (
								<>
									<Spinner data-icon="inline-start" />
									Deleting…
								</>
							) : (
								"Delete"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
