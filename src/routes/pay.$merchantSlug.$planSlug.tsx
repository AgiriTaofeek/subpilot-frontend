import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { formatNGN } from "#/lib/currency.ts";

export const Route = createFileRoute("/pay/$merchantSlug/$planSlug")({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			publicPlanQueryOptions(params.merchantSlug, params.planSlug),
		);
	},
	component: PublicCheckoutPage,
	head: () => ({ meta: [{ title: "Checkout | SubPilot" }] }),
});

const checkoutSchema = z.object({
	fullName: z.string().min(2, "Enter your full name."),
	email: z.email("Enter a valid email."),
	phone: z.string().min(7, "Enter a valid phone number."),
});

function PublicCheckoutPage() {
	const { merchantSlug, planSlug } = Route.useParams();
	const { data: plan } = useSuspenseQuery(
		publicPlanQueryOptions(merchantSlug, planSlug),
	);

	const [slowMessage, setSlowMessage] = useState<
		"none" | "preparing" | "stalled"
	>("none");
	const timersRef = useRef<{
		slow?: ReturnType<typeof setTimeout>;
		stalled?: ReturnType<typeof setTimeout>;
	}>({});

	const form = useForm({
		defaultValues: { fullName: "", email: "", phone: "" },
		validators: { onSubmit: checkoutSchema },
		onSubmit: async ({ value }) => {
			setSlowMessage("none");
			timersRef.current.slow = setTimeout(
				() => setSlowMessage("preparing"),
				3000,
			);
			timersRef.current.stalled = setTimeout(
				() => setSlowMessage("stalled"),
				10000,
			);

			try {
				const result = await initiatePublicCheckout({
					merchantSlug,
					planSlug,
					fullName: value.fullName,
					email: value.email,
					phone: value.phone,
				});

				clearTimeout(timersRef.current.slow);
				clearTimeout(timersRef.current.stalled);
				window.location.assign(result.checkoutUrl);
			} catch (error) {
				clearTimeout(timersRef.current.slow);
				clearTimeout(timersRef.current.stalled);
				const message =
					error instanceof Error
						? error.message
						: "Couldn't start checkout. Please try again.";
				toast.error(message);
			}
		},
	});

	useEffect(() => {
		return () => {
			clearTimeout(timersRef.current.slow);
			clearTimeout(timersRef.current.stalled);
		};
	}, []);

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

								<Button
									type="submit"
									disabled={form.state.isSubmitting}
									className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
								>
									{form.state.isSubmitting
										? "Redirecting…"
										: "Continue to payment"}
								</Button>

								{slowMessage === "preparing" && (
									<p className="text-center text-xs text-(--ink-3)">
										Preparing your secure checkout — almost there.
									</p>
								)}
								{slowMessage === "stalled" && (
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
