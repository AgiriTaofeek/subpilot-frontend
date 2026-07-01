import * as React from "react";

import { cn } from "#/lib/utils.ts";

export type PasswordStrengthValue = "Weak" | "OK" | "Strong";

interface PasswordStrengthContextValue {
	strength: PasswordStrengthValue;
}

const PasswordStrengthContext =
	React.createContext<PasswordStrengthContextValue | null>(null);

function usePasswordStrength() {
	const ctx = React.useContext(PasswordStrengthContext);
	if (!ctx)
		throw new Error(
			"PasswordStrength compound components must be used within <PasswordStrength>",
		);
	return ctx;
}

function PasswordStrength({
	className,
	strength,
	...props
}: React.ComponentProps<"div"> & {
	strength: PasswordStrengthValue;
}) {
	return (
		<PasswordStrengthContext.Provider value={{ strength }}>
			<div
				data-slot="password-strength"
				data-strength={strength.toLowerCase()}
				className={cn("flex flex-col gap-1", className)}
				{...props}
			/>
		</PasswordStrengthContext.Provider>
	);
}

function PasswordStrengthBar({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { strength } = usePasswordStrength();

	const fillClass: Record<PasswordStrengthValue, string> = {
		Weak: "w-1/3 bg-red-500",
		OK: "w-2/3 bg-yellow-500",
		Strong: "w-full bg-green-500",
	};

	return (
		<div
			data-slot="password-strength-bar"
			className={cn(
				"h-1 w-full overflow-hidden rounded-full bg-(--surface-3)",
				className,
			)}
			{...props}
		>
			<div
				className={cn(
					"h-full rounded-full transition-all duration-300",
					fillClass[strength],
				)}
			/>
		</div>
	);
}

function PasswordStrengthLabel({
	className,
	children,
	...props
}: React.ComponentProps<"p">) {
	const { strength } = usePasswordStrength();

	const colorClass: Record<PasswordStrengthValue, string> = {
		Weak: "text-red-500",
		OK: "text-yellow-600",
		Strong: "text-green-600",
	};

	return (
		<p
			data-slot="password-strength-label"
			className={cn("text-xs", colorClass[strength], className)}
			{...props}
		>
			{children ?? strength}
		</p>
	);
}

export { PasswordStrength, PasswordStrengthBar, PasswordStrengthLabel };
