import { WarningCircleIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	getRouteApi,
	Link,
	useBlocker,
	useNavigate,
} from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { AmountInput } from "#/components/ui/amount-input.tsx";
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
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty.tsx";
import {
	Field,
	FieldContent,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group.tsx";
import {
	createPlan,
	type EditablePlanInterval,
	formatInterval,
	restrictedMerchantStatusCopy,
} from "#/data/plans.ts";
import { CATEGORY_COPY, classifyError } from "#/lib/api/classify-error.ts";
import { formatNGN } from "#/lib/currency.ts";

const dashboardRouteApi = getRouteApi("/_dashboard");

export const Route = createFileRoute("/_dashboard/plans/new")({
	component: NewPlanPage,
	head: () => ({ meta: [{ title: "Create plan | SubPilot" }] }),
});

const intervalSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("daily") }),
	z.object({ kind: z.literal("weekly") }),
	z.object({ kind: z.literal("monthly") }),
	z.object({ kind: z.literal("quarterly") }),
	z.object({ kind: z.literal("annual") }),
	z.object({
		kind: z.literal("custom"),
		count: z.number().min(1, "Enter a number of at least 1."),
		unit: z.enum(["day", "week", "month"]),
	}),
]);

const schema = z.object({
	name: z.string().min(2, "Enter a plan name."),
	description: z
		.string()
		.max(500, "Keep the description under 500 characters."),
	amountKobo: z.number().min(100, "Enter an amount greater than ₦0."),
	interval: intervalSchema,
	trialDays: z.number().min(0, "Trial days can't be negative."),
	proration: z.enum(["none", "credit", "charge"]),
});

const intervalPresets = [
	{ value: "daily", label: "Daily" },
	{ value: "weekly", label: "Weekly" },
	{ value: "monthly", label: "Monthly" },
	{ value: "quarterly", label: "Quarterly" },
	{ value: "annual", label: "Yearly" },
	{ value: "custom", label: "Custom" },
] as const;

const prorationOptions = [
	{
		value: "none",
		label: "None",
		description: "No adjustment for mid-cycle changes.",
	},
	{
		value: "credit",
		label: "Credit",
		description: "Unused days refunded to next invoice.",
	},
	{
		value: "charge",
		label: "Charge",
		description: "Subscriber pays for remaining days immediately.",
	},
] as const;

function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function NewPlanPage() {
	const { merchantSession } = dashboardRouteApi.useRouteContext();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const form = useForm({
		defaultValues: {
			name: "",
			description: "",
			amountKobo: 0,
			interval: { kind: "monthly" } as EditablePlanInterval,
			trialDays: 0,
			proration: "none" as "none" | "credit" | "charge",
		},
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			try {
				const plan = await createPlan(value);
				await queryClient.invalidateQueries({ queryKey: ["plans"] });
				form.reset();
				await navigate({ to: "/plans/$planId", params: { planId: plan.id } });
				toast.success("Plan created");
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				toast.error(CATEGORY_COPY[classifyError(message)]);
				return;
			}
		},
	});

	const { proceed, reset, status } = useBlocker({
		shouldBlockFn: () => form.state.isDirty,
		enableBeforeUnload: () => form.state.isDirty,
		withResolver: true,
	});

	if (merchantSession.status !== "active") {
		const copy = restrictedMerchantStatusCopy[merchantSession.status];
		return (
			<div className="p-6">
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyMedia
							variant="icon"
							className={
								merchantSession.status === "suspended"
									? "rounded-full bg-destructive/10 text-destructive"
									: "rounded-full bg-amber-500/10 text-(--warning)"
							}
						>
							<WarningCircleIcon />
						</EmptyMedia>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							{copy.title}
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							{copy.description}
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

	return (
		<div className="p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
					Create plan
				</h1>
				<p className="mt-1 text-sm text-(--ink-3)">
					Publish a plan to get a hosted checkout link you can share with
					customers.
				</p>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				noValidate
				className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
			>
				<Card className="border border-(--line) bg-(--surface-1) shadow-none">
					<CardContent className="pt-6">
						<FieldGroup className="gap-5">
							<form.Field name="name">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel
												htmlFor="name"
												className="text-sm font-medium text-(--ink-2)"
											>
												Name
											</FieldLabel>
											<Input
												id="name"
												autoFocus
												placeholder="Growth Plan"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
												className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
											/>
											<FieldError
												className="text-xs"
												errors={
													isInvalid
														? (field.state.meta.errors as Array<{
																message?: string;
															}>)
														: undefined
												}
											/>
										</Field>
									);
								}}
							</form.Field>

							<form.Field name="description">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel
												htmlFor="description"
												className="text-sm font-medium text-(--ink-2)"
											>
												Description{" "}
												<span className="font-normal text-(--ink-3)">
													(optional)
												</span>
											</FieldLabel>
											<Textarea
												id="description"
												rows={4}
												placeholder="What subscribers get with this plan…"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												className="rounded-md border-(--line) bg-(--surface) px-3 py-2"
											/>
											<div className="flex items-center justify-between">
												<FieldError
													className="text-xs"
													errors={
														isInvalid
															? (field.state.meta.errors as Array<{
																	message?: string;
																}>)
															: undefined
													}
												/>
												<span className="ml-auto text-xs text-(--ink-3)">
													{field.state.value.length} / 500
												</span>
											</div>
										</Field>
									);
								}}
							</form.Field>

							<form.Field name="amountKobo">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel
												htmlFor="amountKobo"
												className="text-sm font-medium text-(--ink-2)"
											>
												Amount
											</FieldLabel>
											<AmountInput
												id="amountKobo"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={field.handleChange}
												aria-invalid={isInvalid}
											/>
											<FieldError
												className="text-xs"
												errors={
													isInvalid
														? (field.state.meta.errors as Array<{
																message?: string;
															}>)
														: undefined
												}
											/>
										</Field>
									);
								}}
							</form.Field>

							<form.Field name="interval">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									const currentKind = field.state.value.kind;
									const customDefaults =
										field.state.value.kind === "custom"
											? field.state.value
											: { count: 1, unit: "month" as const };

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel className="text-sm font-medium text-(--ink-2)">
												Billing interval
											</FieldLabel>
											<ToggleGroup
												type="single"
												variant="outline"
												size="sm"
												value={currentKind}
												onValueChange={(value) => {
													field.handleBlur();
													if (!value) return;
													if (value === "custom") {
														field.handleChange({
															kind: "custom",
															count: customDefaults.count,
															unit: customDefaults.unit,
														});
													} else {
														field.handleChange({
															kind: value as
																| "daily"
																| "weekly"
																| "monthly"
																| "quarterly"
																| "annual",
														});
													}
												}}
												className="overflow-x-auto"
											>
												{intervalPresets.map((p) => (
													<ToggleGroupItem
														key={p.value}
														value={p.value}
														className="rounded-full border-(--line) px-4 text-xs font-medium normal-case tracking-normal data-[state=on]:bg-(--surface-2) data-[state=on]:text-(--ink)"
													>
														{p.label}
													</ToggleGroupItem>
												))}
											</ToggleGroup>

											{currentKind === "custom" && (
												<div className="flex items-center gap-2 pt-1">
													<span className="text-sm text-(--ink-2)">Every</span>
													<Input
														type="number"
														min={1}
														value={customDefaults.count}
														onBlur={field.handleBlur}
														onChange={(e) => {
															const count = Math.max(
																1,
																Number(e.target.value) || 1,
															);
															field.handleChange({
																kind: "custom",
																count,
																unit: customDefaults.unit,
															});
														}}
														className="w-20 border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
													/>
													<Select
														value={customDefaults.unit}
														onValueChange={(unit) =>
															field.handleChange({
																kind: "custom",
																count: customDefaults.count,
																unit: unit as "day" | "week" | "month",
															})
														}
													>
														<SelectTrigger className="w-32 border-(--line) bg-(--surface) px-3">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="day">Days</SelectItem>
															<SelectItem value="week">Weeks</SelectItem>
															<SelectItem value="month">Months</SelectItem>
														</SelectContent>
													</Select>
												</div>
											)}

											<FieldError
												className="text-xs"
												errors={
													isInvalid
														? [
																{
																	message:
																		"Custom interval needs a number and unit.",
																},
															]
														: undefined
												}
											/>
										</Field>
									);
								}}
							</form.Field>

							<form.Field name="trialDays">
								{(field) => (
									<Field>
										<FieldLabel
											htmlFor="trialDays"
											className="text-sm font-medium text-(--ink-2)"
										>
											Trial days{" "}
											<span className="font-normal text-(--ink-3)">
												(optional)
											</span>
										</FieldLabel>
										<Input
											id="trialDays"
											type="number"
											min={0}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(
													Math.max(0, Number(e.target.value) || 0),
												)
											}
											className="w-32 border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
										/>
									</Field>
								)}
							</form.Field>

							<form.Field name="proration">
								{(field) => (
									<Field>
										<FieldLabel className="text-sm font-medium text-(--ink-2)">
											Proration policy
										</FieldLabel>
										<RadioGroup
											value={field.state.value}
											onValueChange={(v) => {
												field.handleChange(v as "none" | "credit" | "charge");
												field.handleBlur();
											}}
										>
											{prorationOptions.map((opt) => (
												<FieldLabel
													key={opt.value}
													htmlFor={`proration-${opt.value}`}
												>
													<Field
														orientation="horizontal"
														className="rounded-md border border-(--line) bg-(--surface) p-3"
													>
														<RadioGroupItem
															value={opt.value}
															id={`proration-${opt.value}`}
														/>
														<FieldContent>
															<span className="text-sm font-medium text-(--ink)">
																{opt.label}
															</span>
															<span className="text-xs text-(--ink-3)">
																{opt.description}
															</span>
														</FieldContent>
													</Field>
												</FieldLabel>
											))}
										</RadioGroup>
									</Field>
								)}
							</form.Field>
						</FieldGroup>
					</CardContent>
				</Card>

				<div className="flex flex-col gap-4">
					<form.Subscribe selector={(state) => state.values}>
						{(values) => {
							const slug = values.name ? slugify(values.name) : "{plan-slug}";
							return (
								<Card className="border border-(--line) bg-(--surface-1) shadow-none">
									<CardHeader>
										<CardTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
											Summary
										</CardTitle>
									</CardHeader>
									<CardContent className="flex flex-col gap-4">
										<div>
											<p className="island-kicker m-0">Plan name</p>
											<p className="mt-1 text-lg font-semibold text-(--ink)">
												{values.name || "Untitled plan"}
											</p>
										</div>
										<div>
											<p className="island-kicker m-0">Price</p>
											<p className="mt-1 text-base font-semibold text-(--ink)">
												{formatNGN(values.amountKobo)} /{" "}
												{formatInterval(values.interval).toLowerCase()}
											</p>
										</div>
										{values.trialDays > 0 && (
											<div>
												<p className="island-kicker m-0">Trial</p>
												<p className="mt-1 text-sm text-(--ink-2)">
													{values.trialDays}-day free trial
												</p>
											</div>
										)}
										<Separator className="bg-(--line)" />
										<div className="flex flex-col gap-1">
											<p className="text-xs font-medium text-(--ink-2)">
												What happens when published
											</p>
											<p className="text-xs leading-relaxed text-(--ink-3)">
												You'll get a shareable checkout link at{" "}
												<span className="font-heading text-(--ink-2)">
													{`/pay/{merchant-slug}/${slug}`}
												</span>
												.
											</p>
										</div>
									</CardContent>
								</Card>
							);
						}}
					</form.Subscribe>

					<div className="flex gap-3">
						<form.Subscribe selector={(state) => state.isSubmitting}>
							{(isSubmitting) => (
								<Button
									type="submit"
									disabled={isSubmitting}
									className="flex-1 border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
								>
									{isSubmitting ? (
										<>
											<Spinner data-icon="inline-start" />
											Creating…
										</>
									) : (
										"Create plan"
									)}
								</Button>
							)}
						</form.Subscribe>
						<Button
							asChild
							type="button"
							variant="outline"
							className="border-(--line)"
						>
							<Link to="/plans">Cancel</Link>
						</Button>
					</div>
				</div>
			</form>

			<Dialog
				open={status === "blocked"}
				onOpenChange={(open) => !open && reset?.()}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Discard unsaved plan?</DialogTitle>
						<DialogDescription>
							You have unsaved changes that will be lost if you leave this page.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => reset?.()}
							className="border-(--line)"
						>
							Keep editing
						</Button>
						<Button variant="destructive" onClick={() => proceed?.()}>
							Discard and leave
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
