import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import {
	formatInterval,
	initiatePublicCheckout,
	publicPlanQueryOptions,
} from "#/data/plans.ts";
import { useSlowState } from "#/hooks/use-slow-state.ts";
import { CATEGORY_COPY, classifyError } from "#/lib/api/classify-error.ts";
import { formatNGN } from "#/lib/currency.ts";

export const Route = createFileRoute("/pay/$merchantSlug/$planSlug")({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			publicPlanQueryOptions(params.merchantSlug, params.planSlug),
		);
	},
	component: PublicCheckoutPage,
	errorComponent: CheckoutErrorFallback,
	head: () => ({ meta: [{ title: "Checkout | SubPilot" }] }),
});

function CheckoutErrorFallback({
	error,
	reset,
}: {
	error: Error;
	reset: () => void;
}) {
	// A genuinely not-found plan/merchant slug means this checkout link will
	// never work (typo, archived plan, wrong link shared) — a network blip
	// or transient backend error is retryable and shouldn't tell the
	// customer the link is dead.
	const isNotFound = classifyError(error.message) === "not_found";

	return (
		<div className="flex min-h-screen items-center justify-center bg-(--surface) px-4">
			<div className="max-w-sm flex flex-col gap-3 rounded-2xl border border-(--line) bg-(--surface-1) p-8 text-center shadow-sm">
				<h1 className="text-lg font-semibold tracking-tight text-(--ink)">
					{isNotFound
						? "This checkout link is no longer valid"
						: "Something went wrong"}
				</h1>
				<p className="text-sm text-(--ink-3)">
					{isNotFound
						? "Please contact the business to get an updated link."
						: CATEGORY_COPY[classifyError(error.message)]}
				</p>
				{!isNotFound && (
					<Button
						variant="outline"
						onClick={reset}
						className="mx-auto w-fit border-(--line)"
					>
						Try again
					</Button>
				)}
			</div>
		</div>
	);
}

const checkoutSchema = z.object({
	fullName: z
		.string()
		.min(2, "Enter your full name.")
		.max(100, "Full name must be 100 characters or fewer."),
	email: z.email("Enter a valid email.").max(255, "Email is too long."),
	phone: z
		.string()
		.regex(
			/^[+\d\s()-]{8,20}$/,
			"Enter a valid phone number (8-20 digits, spaces, +, (), or -).",
		),
});

function PublicCheckoutPage() {
	const { merchantSlug, planSlug } = Route.useParams();
	const { data: plan } = useSuspenseQuery(
		publicPlanQueryOptions(merchantSlug, planSlug),
	);

	const { tier, start, reset } = useSlowState();

	const form = useForm({
		defaultValues: { fullName: "", email: "", phone: "" },
		validators: { onSubmit: checkoutSchema },
		onSubmit: async ({ value }) => {
			start();

			try {
				const result = await initiatePublicCheckout({
					merchantSlug,
					planSlug,
					fullName: value.fullName,
					email: value.email,
					phone: value.phone,
				});

				reset();
				window.location.assign(result.checkoutUrl);
			} catch (error) {
				reset();
				const message =
					error instanceof Error
						? error.message
						: "Couldn't start checkout. Please try again.";
				toast.error(CATEGORY_COPY[classifyError(message)]);
			}
		},
	});

	return (
		<div className="min-h-screen bg-(--surface)">
			<header className="border-b border-(--line) px-4 py-4">
				<div className="mx-auto flex max-w-3xl items-center gap-2">
					<span className="text-sm font-semibold tracking-tight text-(--ink)">
						SubPilot
					</span>
					<span className="text-(--ink-3)">·</span>
					<span className="font-heading text-sm text-(--ink-2)">
						{plan.merchantName}
					</span>
				</div>
			</header>

			<main className="mx-auto grid max-w-3xl gap-8 px-4 py-8 lg:grid-cols-2 lg:items-start">
				<div className="flex flex-col gap-4">
					<div>
						<p className="island-kicker m-0">{plan.name}</p>
						<p className="mt-1 text-3xl font-semibold tracking-tight text-(--ink)">
							{formatNGN(plan.amountKobo)}
							<span className="text-base font-normal text-(--ink-3)">
								{" "}
								/ {formatInterval(plan.interval).toLowerCase()}
							</span>
						</p>
						{plan.trialDays > 0 && (
							<p className="mt-1 text-sm text-(--ink-2)">
								{plan.trialDays}-day free trial
							</p>
						)}
					</div>
					{plan.description && (
						<p className="hidden text-sm leading-relaxed text-(--ink-2) lg:block">
							{plan.description}
						</p>
					)}
					<p className="text-xs text-(--ink-3)">
						Secure checkout powered by Nomba.
					</p>
				</div>

				<div className="flex flex-col gap-4">
					<Card className="border border-(--line) bg-(--surface-1) shadow-sm">
						<CardHeader>
							<CardTitle className="font-sans text-lg normal-case tracking-tight text-(--ink)">
								Your details
							</CardTitle>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									form.handleSubmit();
								}}
								noValidate
								className="flex flex-col gap-4"
							>
								<FieldGroup className="gap-4">
									<form.Field name="fullName">
										{(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel
														htmlFor="fullName"
														className="text-sm font-medium text-(--ink-2)"
													>
														Full name
													</FieldLabel>
													<Input
														id="fullName"
														autoFocus
														autoComplete="name"
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

									<form.Field name="email">
										{(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel
														htmlFor="email"
														className="text-sm font-medium text-(--ink-2)"
													>
														Email
													</FieldLabel>
													<Input
														id="email"
														type="email"
														autoComplete="email"
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

									<form.Field name="phone">
										{(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel
														htmlFor="phone"
														className="text-sm font-medium text-(--ink-2)"
													>
														Phone
													</FieldLabel>
													<Input
														id="phone"
														type="tel"
														autoComplete="tel"
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
								</FieldGroup>

								<Separator className="bg-(--line)" />

								<form.Subscribe selector={(state) => state.isSubmitting}>
									{(isSubmitting) => (
										<Button
											type="submit"
											disabled={isSubmitting}
											className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
										>
											{isSubmitting ? "Redirecting…" : "Continue to payment"}
										</Button>
									)}
								</form.Subscribe>

								{tier === "delayed" && (
									<p className="text-center text-xs text-(--ink-3)">
										Preparing your secure checkout — almost there.
									</p>
								)}
								{tier === "very_delayed" && (
									<p className="text-center text-xs text-(--warning)">
										This is taking longer than usual. Check your connection or
										try again.
									</p>
								)}

								<p className="text-center text-xs text-(--ink-3)">
									You'll be redirected to Nomba to enter your card details.
									SubPilot does not collect your card details on this page.
								</p>
							</form>
						</CardContent>
					</Card>

					{plan.description && (
						<p className="text-sm leading-relaxed text-(--ink-2) lg:hidden">
							{plan.description}
						</p>
					)}
				</div>
			</main>
		</div>
	);
}
