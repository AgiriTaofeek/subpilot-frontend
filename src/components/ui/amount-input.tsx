import * as React from "react";

import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/ui/input-group.tsx";

interface AmountInputProps
	extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
	value: number;
	onChange: (amountKobo: number) => void;
}

// Kobo is the smallest real unit, so rounding only ever happens here, at
// the naira-input -> kobo-integer boundary — never when converting kobo
// back to naira for display, which would silently truncate a real amount
// (e.g. a prorated invoice's exact kobo remainder) to whatever the user
// last typed in whole naira.
function nairaDisplay(amountKobo: number): string {
	if (amountKobo <= 0) return "";
	const naira = amountKobo / 100;
	// Whole-naira amounts re-enter as "100", not "100.00" the user would
	// otherwise have to backspace through, but a real kobo remainder is
	// always shown.
	return Number.isInteger(naira) ? String(naira) : naira.toFixed(2);
}

const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
	({ value, onChange, className, ...props }, ref) => {
		const [display, setDisplay] = React.useState(() => nairaDisplay(value));

		React.useEffect(() => {
			setDisplay(nairaDisplay(value));
		}, [value]);

		return (
			<InputGroup className="rounded-md border-(--line) bg-(--surface) px-3">
				<InputGroupAddon className="text-(--ink-3)">₦</InputGroupAddon>
				<InputGroupInput
					ref={ref}
					inputMode="decimal"
					placeholder="0.00"
					value={display}
					onChange={(e) => {
						// Digits and at most one decimal point with up to 2 decimal
						// places — kobo is naira's smallest unit, so anything finer
						// isn't a real amount to begin with.
						const match = e.target.value
							.replace(/[^\d.]/g, "")
							.match(/^\d*\.?\d{0,2}/);
						const sanitized = match?.[0] ?? "";
						setDisplay(sanitized);
						const parsedNaira = Number(sanitized);
						onChange(
							sanitized && Number.isFinite(parsedNaira)
								? Math.round(parsedNaira * 100)
								: 0,
						);
					}}
					className={className}
					{...props}
				/>
			</InputGroup>
		);
	},
);
AmountInput.displayName = "AmountInput";

export { AmountInput };
