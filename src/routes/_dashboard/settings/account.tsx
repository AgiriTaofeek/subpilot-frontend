import { CopyIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	getRouteApi,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { SettingsTabs } from "#/components/layout/settings-tabs.tsx";
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
import { plansQueryOptions } from "#/data/plans.ts";
import { changePasswordMerchant, logoutMerchant } from "#/lib/api/auth.ts";
import { CATEGORY_COPY, classifyError } from "#/lib/api/classify-error.ts";

const dashboardRouteApi = getRouteApi("/_dashboard");

const changePasswordSchema = z.object({
	currentPassword: z.string().min(1, "Enter your current password."),
	newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

// The backend returns this exact string for both "wrong login password" and
// "wrong current password on change" (one shared BadCredentialsException
// handler) — matching on it is the only way to tell "current password wrong"
// apart from a genuinely dead session, which surfaces as "Unauthorized"
// instead (see AuthController.changePassword / GlobalExceptionHandler).
const WRONG_CURRENT_PASSWORD_MESSAGE = "Invalid email or password.";

function passwordStrength(password: string): PasswordStrengthValue {
	if (!password || password.length < 8) return "Weak";
	const checks = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) =>
		r.test(password),
	).length;
	if (checks >= 3) return "Strong";
	return "OK";
}

function ChangePasswordForm() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [showPassword, setShowPassword] = useState(false);
	const [currentPasswordError, setCurrentPasswordError] = useState<
		string | null
	>(null);

	const form = useForm({
		defaultValues: { currentPassword: "", newPassword: "" },
		validators: { onSubmit: changePasswordSchema },
		onSubmit: async ({ value, formApi }) => {
			setCurrentPasswordError(null);
			try {
				await changePasswordMerchant({ data: value });
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error";
				if (message === WRONG_CURRENT_PASSWORD_MESSAGE) {
					setCurrentPasswordError("Current password is incorrect.");
				} else {
					toast.error(CATEGORY_COPY[classifyError(message)]);
				}
				return;
			}

			formApi.reset();
			toast.success("Password changed. Please log in again.");
			try {
				await logoutMerchant();
			} catch {
				// Best-effort — the session cookies are already invalid server-side
				// (password change revoked the refresh token), so the redirect below
				// is correct either way.
			}
			queryClient.clear();
			await navigate({ to: "/auth/login" });
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			noValidate
			className="flex flex-col gap-4"
		>
			<FieldGroup className="gap-4">
				<form.Field name="currentPassword">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						const hasError = isInvalid || currentPasswordError !== null;
						return (
							<Field data-invalid={hasError}>
								<FieldLabel
									htmlFor="currentPassword"
									className="text-sm font-medium text-(--ink-2)"
								>
									Current password
								</FieldLabel>
								<InputGroup className="rounded-md border-(--line) bg-(--surface) px-3">
									<InputGroupInput
										id="currentPassword"
										name={field.name}
										type={showPassword ? "text" : "password"}
										autoComplete="current-password"
										placeholder="••••••••"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => {
											setCurrentPasswordError(null);
											field.handleChange(e.target.value);
										}}
										aria-invalid={hasError}
									/>
									<InputGroupAddon align="inline-end">
										<InputGroupButton
											size="icon-sm"
											onClick={() => setShowPassword((v) => !v)}
											aria-label={
												showPassword ? "Hide passwords" : "Show passwords"
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
										currentPasswordError
											? [{ message: currentPasswordError }]
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

				<form.Field name="newPassword">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						const strength = passwordStrength(field.state.value);
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel
									htmlFor="newPassword"
									className="text-sm font-medium text-(--ink-2)"
								>
									New password
								</FieldLabel>
								<Input
									id="newPassword"
									name={field.name}
									type={showPassword ? "text" : "password"}
									autoComplete="new-password"
									placeholder="Min 8 characters"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									aria-invalid={isInvalid}
									className="border-(--line) bg-(--surface) px-3 focus-visible:ring-(--brand)/30"
								/>
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
			</FieldGroup>

			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<Button
						type="submit"
						disabled={isSubmitting}
						className="w-fit border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90 active:scale-[0.98]"
					>
						{isSubmitting ? (
							<>
								<Spinner data-icon="inline-start" />
								Changing password…
							</>
						) : (
							"Change password"
						)}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

export const Route = createFileRoute("/_dashboard/settings/account")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(plansQueryOptions());
	},
	component: SettingsAccountPage,
	head: () => ({ meta: [{ title: "Account | SubPilot" }] }),
});

async function copySlugPrefix(merchantSlug: string) {
	try {
		await navigator.clipboard.writeText(`/pay/${merchantSlug}/`);
		toast.success("Checkout link prefix copied", { duration: 2000 });
	} catch {
		toast.error("Couldn't copy to clipboard.");
	}
}

function SettingsAccountPage() {
	const { merchantSession } = dashboardRouteApi.useRouteContext();
	const { data: allPlans } = useSuspenseQuery(plansQueryOptions());
	const merchantSlug = allPlans[0]?.merchantSlug ?? null;

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
								value={merchantSession.businessName}
								readOnly
								className="border-(--line) bg-(--surface) px-3 text-(--ink-3)"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<p className="text-sm font-medium text-(--ink-2)">Email</p>
							<Input
								value={merchantSession.email}
								readOnly
								className="border-(--line) bg-(--surface) px-3 text-(--ink-3)"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<p className="text-sm font-medium text-(--ink-2)">
								Merchant slug
							</p>
							{merchantSlug ? (
								<>
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
											onClick={() => copySlugPrefix(merchantSlug)}
											className="shrink-0 text-(--ink-3) hover:text-(--ink)"
										>
											<CopyIcon className="size-4" />
										</Button>
									</div>
								</>
							) : (
								<p className="m-0 text-xs text-(--ink-3)">
									Create a plan to get your checkout link prefix.
								</p>
							)}
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
						<ChangePasswordForm />
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
