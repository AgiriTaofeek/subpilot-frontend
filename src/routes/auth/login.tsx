import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "#/components/ui/card.tsx";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { loginMerchant } from "#/lib/api/auth.ts";
import { CATEGORY_COPY, classifyError } from "#/lib/api/classify-error.ts";

export const Route = createFileRoute("/auth/login")({
	component: LoginPage,
	head: () => ({ meta: [{ title: "Sign in | SubPilot" }] }),
});

const schema = z.object({
	email: z.email("Enter a valid email."),
	password: z.string().min(1, "Password is required."),
});

function LoginPage() {
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const [credentialError, setCredentialError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { email: "", password: "" },
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			setCredentialError(null);
			try {
				await loginMerchant({
					data: { email: value.email, password: value.password },
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error";
				if (
					message.toLowerCase().includes("credentials") ||
					message.toLowerCase().includes("incorrect")
				) {
					setCredentialError("Incorrect email or password.");
				} else {
					toast.error(CATEGORY_COPY[classifyError(message)]);
				}
				return;
			}
			// navigate outside try/catch so routing errors propagate normally
			await navigate({ to: "/overview" });
		},
	});

	return (
		<Card className="w-full max-w-105 border border-(--line) bg-(--surface-1) shadow-sm">
			<CardHeader className="pb-4">
				<h1 className="text-xl font-semibold tracking-tight text-(--ink)">
					Log in
				</h1>
				<CardDescription className="text-(--ink-3)">
					Manage plans, subscriptions, revenue, and webhook activity.
				</CardDescription>
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
											name={field.name}
											type="email"
											autoComplete="email"
											autoFocus
											placeholder="you@business.com"
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

						<form.Field name="password">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								const hasError = isInvalid || credentialError !== null;
								return (
									<Field data-invalid={hasError}>
										<FieldLabel
											htmlFor="password"
											className="text-sm font-medium text-(--ink-2)"
										>
											Password
										</FieldLabel>
										<InputGroup className="rounded-md border-(--line) bg-(--surface) px-3">
											<InputGroupInput
												id="password"
												name={field.name}
												type={showPassword ? "text" : "password"}
												autoComplete="current-password"
												placeholder="••••••••"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => {
													setCredentialError(null);
													field.handleChange(e.target.value);
												}}
												aria-invalid={hasError}
											/>
											<InputGroupAddon align="inline-end">
												<InputGroupButton
													size="icon-sm"
													onClick={() => setShowPassword((v) => !v)}
													aria-label={
														showPassword ? "Hide password" : "Show password"
													}
													className="text-(--ink-3) hover:text-(--ink-2)"
												>
													{showPassword ? (
														<EyeSlashIcon className="size-4" />
													) : (
														<EyeIcon className="size-4" />
													)}
												</InputGroupButton>
											</InputGroupAddon>
										</InputGroup>
										<FieldError
											className="text-xs"
											errors={
												credentialError
													? [{ message: credentialError }]
													: isInvalid
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
								className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90 active:scale-[0.98]"
							>
								{isSubmitting ? (
									<>
										<Spinner data-icon="inline-start" />
										Logging in…
									</>
								) : (
									"Log in"
								)}
							</Button>
						)}
					</form.Subscribe>
				</form>

				<p className="mt-5 text-center text-sm text-(--ink-3)">
					Don't have an account?{" "}
					<Link
						to="/auth/signup"
						className="font-medium text-(--ink-2) underline-offset-4 hover:text-(--ink) hover:underline"
					>
						Create one
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
