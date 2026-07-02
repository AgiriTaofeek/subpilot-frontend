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

function nairaDisplay(amountKobo: number): string {
	return amountKobo > 0 ? String(Math.round(amountKobo / 100)) : "";
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
					inputMode="numeric"
					placeholder="0"
					value={display}
					onChange={(e) => {
						const digits = e.target.value.replace(/\D/g, "");
						setDisplay(digits);
						onChange(digits ? Number(digits) * 100 : 0);
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
