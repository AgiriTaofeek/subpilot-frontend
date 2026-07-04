import {
	CopyIcon,
	DotsThreeIcon,
	PlusIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "#/components/ui/button.tsx";
import { Checkbox } from "#/components/ui/checkbox.tsx";
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
import {
	Field,
	FieldContent,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { ListPageSkeleton } from "#/components/ui/page-skeleton.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "#/components/ui/sheet.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
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
	eventTypeGroups,
	webhookEndpointsListQueryOptions,
} from "#/data/webhooks.ts";
import { useHandleMutationError } from "#/hooks/use-handle-mutation-error.ts";
import {
	deleteWebhookEndpoint,
	registerWebhookEndpoint,
} from "#/lib/api/webhooks.ts";
import { formatDate } from "#/lib/date.ts";
import type { WebhookEndpointDto } from "#/types/api.ts";

export const Route = createFileRoute("/_dashboard/webhooks/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			webhookEndpointsListQueryOptions(),
		);
	},
	component: WebhookEndpointsPage,
	pendingComponent: () => <ListPageSkeleton columns={6} />,
	head: () => ({ meta: [{ title: "Webhooks | SubPilot" }] }),
});

const registerSchema = z.object({
	url: z
		.url("Enter a valid URL.")
		.refine(
			(url) => url.startsWith("https://") || url.startsWith("http://localhost"),
			{
				message: "Production endpoints must use HTTPS.",
			},
		),
	description: z
		.string()
		.max(200, "Keep the description under 200 characters."),
	events: z.array(z.string()).min(1, "Select at least one event."),
});

function WebhookEndpointsPage() {
	const queryClient = useQueryClient();
	const { data: endpoints } = useSuspenseQuery(
		webhookEndpointsListQueryOptions(),
	);
	const [registerOpen, setRegisterOpen] = useState(false);
	const [secretTarget, setSecretTarget] = useState<WebhookEndpointDto | null>(
		null,
	);
	const [deleteTarget, setDeleteTarget] = useState<WebhookEndpointDto | null>(
		null,
	);
	const handleMutationError = useHandleMutationError();

	const registerMutation = useMutation({
		mutationFn: (value: {
			url: string;
			description: string;
			events: string[];
		}) => registerWebhookEndpoint({ data: value }),
		onSuccess: async (created) => {
			await queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
			form.reset();
			setRegisterOpen(false);
			setSecretTarget(created);
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't register the endpoint.",
			}),
	});

	const deleteMutation = useMutation({
		mutationFn: (endpointId: string) =>
			deleteWebhookEndpoint({ data: { endpointId } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
			toast.success("Webhook endpoint deleted");
			setDeleteTarget(null);
		},
		onError: (error) =>
			handleMutationError(error, {
				fallbackMessage: "Couldn't delete the endpoint.",
			}),
	});

	const form = useForm({
		defaultValues: { url: "", description: "", events: [] as string[] },
		validators: { onSubmit: registerSchema },
		onSubmit: async ({ value }) => {
			await registerMutation.mutateAsync(value);
		},
	});

	function handleDelete() {
		if (!deleteTarget) return;
		deleteMutation.mutate(deleteTarget.id);
	}

	async function copySecret() {
		if (!secretTarget) return;
		try {
			await navigator.clipboard.writeText(secretTarget.signingSecretHash);
			toast.success("Signing secret copied");
		} catch {
			toast.error("Couldn't copy to clipboard.");
		}
	}

	const hasEndpoints = endpoints.length > 0;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold tracking-tight text-(--ink)">
					Webhooks
				</h1>
				<div className="flex items-center gap-2">
					<Button asChild variant="outline" className="border-(--line)">
						<Link to="/webhooks/deliveries">View deliveries</Link>
					</Button>
					<Sheet open={registerOpen} onOpenChange={setRegisterOpen}>
						<SheetTrigger asChild>
							<Button className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90">
								<PlusIcon data-icon="inline-start" />
								Register endpoint
							</Button>
						</SheetTrigger>
						<SheetContent
							side="right"
							className="w-full border-(--line) bg-(--surface-1) sm:max-w-md"
						>
							<SheetHeader className="pb-4">
								<SheetTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
									Register endpoint
								</SheetTitle>
								<SheetDescription className="text-(--ink-2)">
									Choose which events this endpoint should receive.
								</SheetDescription>
							</SheetHeader>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									form.handleSubmit();
								}}
								noValidate
								className="flex flex-1 flex-col gap-4 overflow-y-auto px-8 pb-8"
							>
								<FieldGroup className="gap-4">
									<form.Field name="url">
										{(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											const showHttpWarning =
												field.state.value.startsWith("http://") &&
												!field.state.value.startsWith("http://localhost");
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel
														htmlFor="url"
														className="text-sm font-medium text-(--ink-2)"
													>
														Endpoint URL
													</FieldLabel>
													<Input
														id="url"
														placeholder="https://your-app.com/webhooks/subpilot"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														aria-invalid={isInvalid}
														className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
													/>
													{showHttpWarning && !isInvalid && (
														<p className="flex items-center gap-1.5 text-xs text-(--warning)">
															<WarningCircleIcon className="size-3.5" />
															Production endpoints must use HTTPS.
														</p>
													)}
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
										{(field) => (
											<Field>
												<FieldLabel
													htmlFor="description"
													className="text-sm font-medium text-(--ink-2)"
												>
													Description{" "}
													<span className="font-normal text-(--ink-3)">
														(optional)
													</span>
												</FieldLabel>
												<Input
													id="description"
													placeholder="Production billing sync"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
												/>
											</Field>
										)}
									</form.Field>

									<form.Field name="events">
										{(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											const selected = field.state.value;
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel className="text-sm font-medium text-(--ink-2)">
														Events
													</FieldLabel>
													<div className="flex flex-col gap-3">
														{eventTypeGroups.map((group) => {
															const allChecked = group.events.every((ev) =>
																selected.includes(ev),
															);
															const someChecked = group.events.some((ev) =>
																selected.includes(ev),
															);
															return (
																<div
																	key={group.group}
																	className="flex flex-col gap-2 rounded-md border border-(--line) p-3"
																>
																	<Field orientation="horizontal">
																		<Checkbox
																			id={`group-${group.group}`}
																			checked={
																				allChecked
																					? true
																					: someChecked
																						? "indeterminate"
																						: false
																			}
																			onCheckedChange={(checked) => {
																				if (checked) {
																					field.handleChange([
																						...new Set([
																							...selected,
																							...group.events,
																						]),
																					]);
																				} else {
																					field.handleChange(
																						selected.filter(
																							(ev) =>
																								!group.events.includes(ev),
																						),
																					);
																				}
																			}}
																		/>
																		<FieldContent>
																			<FieldLabel
																				htmlFor={`group-${group.group}`}
																				className="text-sm font-semibold text-(--ink)"
																			>
																				{group.group}
																			</FieldLabel>
																		</FieldContent>
																	</Field>
																	<Separator className="bg-(--line)" />
																	<div className="flex flex-col gap-1.5 pl-1">
																		{group.events.map((ev) => (
																			<Field key={ev} orientation="horizontal">
																				<Checkbox
																					id={ev}
																					checked={selected.includes(ev)}
																					onCheckedChange={(checked) => {
																						field.handleChange(
																							checked
																								? [...selected, ev]
																								: selected.filter(
																										(e) => e !== ev,
																									),
																						);
																					}}
																				/>
																				<FieldContent>
																					<FieldLabel
																						htmlFor={ev}
																						className="font-heading text-xs font-normal text-(--ink-2)"
																					>
																						{ev}
																					</FieldLabel>
																				</FieldContent>
																			</Field>
																		))}
																	</div>
																</div>
															);
														})}
													</div>
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
								</FieldGroup>

								<form.Subscribe selector={(state) => state.isSubmitting}>
									{(isSubmitting) => (
										<Button
											type="submit"
											disabled={isSubmitting}
											className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
										>
											{isSubmitting ? (
												<>
													<Spinner data-icon="inline-start" />
													Registering…
												</>
											) : (
												"Register endpoint"
											)}
										</Button>
									)}
								</form.Subscribe>
							</form>
						</SheetContent>
					</Sheet>
				</div>
			</div>

			{!hasEndpoints ? (
				<Empty className="rounded-2xl border border-dashed border-(--line) bg-(--surface-1)">
					<EmptyHeader>
						<EmptyTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
							No webhook endpoints
						</EmptyTitle>
						<EmptyDescription className="text-(--ink-3)">
							Register an endpoint to start receiving event notifications.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button
							onClick={() => setRegisterOpen(true)}
							className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							Register endpoint
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<>
					{/* Desktop table */}
					<div className="hidden overflow-hidden rounded-2xl border border-(--line) bg-(--surface-1) md:block">
						<Table>
							<TableHeader>
								<TableRow className="border-(--line) hover:bg-transparent">
									<TableHead className="text-(--ink-3)">URL</TableHead>
									<TableHead className="text-(--ink-3)">Description</TableHead>
									<TableHead className="text-(--ink-3)">Events</TableHead>
									<TableHead className="text-(--ink-3)">Status</TableHead>
									<TableHead className="text-(--ink-3)">Created</TableHead>
									<TableHead className="text-(--ink-3)" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{endpoints.map((ep) => (
									<TableRow key={ep.id} className="border-(--line)">
										<TableCell className="font-heading text-xs text-(--ink)">
											{ep.url}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{ep.description || "—"}
										</TableCell>
										<TableCell className="text-(--ink-2)">
											{ep.subscribedEvents.length} event
											{ep.subscribedEvents.length === 1 ? "" : "s"}
										</TableCell>
										<TableCell>
											<StatusBadge tone={ep.active ? "success" : "neutral"}>
												{ep.active ? "Active" : "Inactive"}
											</StatusBadge>
										</TableCell>
										<TableCell className="text-(--ink-3)">
											{formatDate(ep.createdAt)}
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon-sm"
														aria-label="Endpoint actions"
														className="text-(--ink-3) hover:text-(--ink)"
													>
														<DotsThreeIcon className="size-5" weight="bold" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={() => setSecretTarget(ep)}>
														View signing secret
													</DropdownMenuItem>
													<DropdownMenuItem
														variant="destructive"
														onClick={() => setDeleteTarget(ep)}
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

					{/* Mobile cards */}
					<div className="flex flex-col gap-3 md:hidden">
						{endpoints.map((ep) => (
							<div
								key={ep.id}
								className="flex flex-col gap-2 rounded-2xl border border-(--line) bg-(--surface-1) p-4"
							>
								<div className="flex items-start justify-between gap-2">
									<span className="font-heading text-xs break-all text-(--ink)">
										{ep.url}
									</span>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label="Endpoint actions"
												className="shrink-0 text-(--ink-3) hover:text-(--ink)"
											>
												<DotsThreeIcon className="size-5" weight="bold" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={() => setSecretTarget(ep)}>
												View signing secret
											</DropdownMenuItem>
											<DropdownMenuItem
												variant="destructive"
												onClick={() => setDeleteTarget(ep)}
											>
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
								<div className="text-sm text-(--ink-2)">
									{ep.description || "No description"}
								</div>
								<div className="flex items-center gap-2">
									<StatusBadge tone={ep.active ? "success" : "neutral"}>
										{ep.active ? "Active" : "Inactive"}
									</StatusBadge>
									<span className="text-xs text-(--ink-3)">
										{ep.subscribedEvents.length} event
										{ep.subscribedEvents.length === 1 ? "" : "s"}
									</span>
								</div>
							</div>
						))}
					</div>
				</>
			)}

			<Dialog
				open={deleteTarget !== null}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete this endpoint?</DialogTitle>
						<DialogDescription>
							Deleting this endpoint will permanently stop all event deliveries
							to{" "}
							<span className="font-heading text-xs text-(--ink)">
								{deleteTarget?.url}
							</span>
							. This cannot be undone.
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
							onClick={handleDelete}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? (
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

			<Dialog
				open={secretTarget !== null}
				onOpenChange={(open) => !open && setSecretTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Signing secret</DialogTitle>
						<DialogDescription>
							Use this to verify the{" "}
							<span className="font-heading">X-SubPilot-Signature</span> header
							on incoming webhook requests to{" "}
							<span className="font-heading text-xs text-(--ink)">
								{secretTarget?.url}
							</span>
							. You can view it again here any time.
						</DialogDescription>
					</DialogHeader>
					<div className="flex items-center gap-2 rounded-md border border-(--line) bg-(--surface) px-3 py-2">
						<span className="flex-1 truncate font-heading text-xs text-(--ink)">
							{secretTarget?.signingSecretHash}
						</span>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={copySecret}
							className="shrink-0 text-(--ink-3) hover:text-(--ink)"
						>
							<CopyIcon className="size-4" />
						</Button>
					</div>
					<DialogFooter>
						<Button
							onClick={() => setSecretTarget(null)}
							className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
						>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
