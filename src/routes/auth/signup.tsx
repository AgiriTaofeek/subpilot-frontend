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
import {
	PasswordStrength,
	PasswordStrengthBar,
	PasswordStrengthLabel,
	type PasswordStrengthValue,
} from "#/components/ui/password-strength.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";

export const Route = createFileRoute("/auth/signup")({
	component: SignupPage,
	head: () => ({ meta: [{ title: "Create account | SubPilot" }] }),
});

const schema = z.object({
	businessName: z.string().min(2, "Enter your business name."),
	email: z.email("Enter a valid email."),
	password: z.string().min(8, "Password must be at least 8 characters."),
	phone: z.string(),
});

function passwordStrength(password: string): PasswordStrengthValue {
	if (!password || password.length < 8) return "Weak";
	const checks = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) =>
		r.test(password),
	).length;
	if (checks >= 3) return "Strong";
	return "OK";
}

function SignupPage() {
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const [emailTakenError, setEmailTakenError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { businessName: "", email: "", password: "", phone: "" },
		validators: { onSubmit: schema },
		onSubmit: async () => {
			setEmailTakenError(null);
			try {
				// TODO: replace with TanStack Start server function proxying to /v1/auth/signup
				// await signupServerFn({ ...value })
				await new Promise<void>((_, reject) =>
					setTimeout(
						() => reject(new Error("Backend not yet connected.")),
						800,
					),
				);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error";
				if (
					message.toLowerCase().includes("email") &&
					message.toLowerCase().includes("taken")
				) {
					setEmailTakenError("An account with this email already exists.");
				} else {
					toast.error("Couldn't reach the server. Check your connection.");
				}
				return;
			}
			// navigate + toast outside try/catch so routing errors propagate normally
			await navigate({ to: "/overview" });
			toast.success(
				"Account created. Publish your first plan to get a checkout link.",
			);
		},
	});

	return (
		<Card className="w-full max-w-130 border border-(--line) bg-(--surface-1) shadow-sm">
			<CardHeader className="pb-4">
				<h1 className="text-xl font-semibold tracking-tight text-(--ink)">
					Create your account
				</h1>
				<CardDescription className="text-(--ink-3)">
					Publish your first plan and start collecting recurring payments.
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
						<form.Field name="businessName">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											htmlFor="businessName"
											className="text-sm font-medium text-(--ink-2)"
										>
											Business name
										</FieldLabel>
										<Input
											id="businessName"
											name={field.name}
											type="text"
											autoComplete="organization"
											autoFocus
											placeholder="Acme Corp"
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
								const hasError = isInvalid || emailTakenError !== null;
								return (
									<Field data-invalid={hasError}>
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
											placeholder="you@business.com"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => {
												setEmailTakenError(null);
												field.handleChange(e.target.value);
											}}
											aria-invalid={hasError}
											className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
										/>
										<FieldError
											className="text-xs"
											errors={
												emailTakenError
													? [{ message: emailTakenError }]
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

						<form.Field name="password">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								const strength = passwordStrength(field.state.value);
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											htmlFor="password"
											className="text-sm font-medium text-(--ink-2)"
										>
											Password
										</FieldLabel>
										<InputGroup className="rounded-md border-(--line) bg-(--surface)">
											<InputGroupInput
												id="password"
												name={field.name}
												type={showPassword ? "text" : "password"}
												autoComplete="new-password"
												placeholder="Min 8 characters"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
												className="px-3"
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

										{field.state.value.length > 0 && (
											<PasswordStrength strength={strength}>
												<PasswordStrengthBar />
												<PasswordStrengthLabel />
											</PasswordStrength>
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

						<form.Field name="phone">
							{(field) => (
								<Field>
									<FieldLabel
										htmlFor="phone"
										className="text-sm font-medium text-(--ink-2)"
									>
										Phone{" "}
										<span className="font-normal text-(--ink-3)">
											(optional)
										</span>
									</FieldLabel>
									<Input
										id="phone"
										name={field.name}
										type="tel"
										autoComplete="tel"
										placeholder="+234 800 000 0000"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
									/>
								</Field>
							)}
						</form.Field>
					</FieldGroup>

					<Button
						type="submit"
						disabled={form.state.isSubmitting}
						className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90 active:scale-[0.98]"
					>
						{form.state.isSubmitting ? (
							<>
								<Spinner data-icon="inline-start" />
								Creating account…
							</>
						) : (
							"Create account"
						)}
					</Button>

					<p className="text-center text-xs text-(--ink-3)">
						You can change billing settings later.
					</p>
				</form>

				<p className="mt-5 text-center text-sm text-(--ink-3)">
					Already have an account?{" "}
					<Link
						to="/auth/login"
						className="font-medium text-(--ink-2) underline-offset-4 hover:text-(--ink) hover:underline"
					>
						Log in
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
