import {
	CheckCircleIcon,
	InfoIcon,
	SpinnerIcon,
	WarningIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	// Default to "light" to match SSR output (document is undefined on server).
	// useEffect syncs from DOM and watches for subsequent class changes.
	const [theme, setTheme] = useState<"light" | "dark">("light");

	useEffect(() => {
		const read = () =>
			document.documentElement.classList.contains("dark") ? "dark" : "light";

		setTheme(read());

		const observer = new MutationObserver(() => setTheme(read()));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		return () => observer.disconnect();
	}, []);

	return (
		<Sonner
			theme={theme}
			className="toaster group"
			icons={{
				success: <CheckCircleIcon className="size-4" />,
				info: <InfoIcon className="size-4" />,
				warning: <WarningIcon className="size-4" />,
				error: <XCircleIcon className="size-4" />,
				loading: <SpinnerIcon className="size-4 animate-spin" />,
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					"--border-radius": "var(--radius)",
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					toast: "cn-toast",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
