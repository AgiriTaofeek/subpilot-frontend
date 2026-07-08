import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "auto";

function getInitialMode(): ThemeMode {
	if (typeof window === "undefined") return "auto";
	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark" || stored === "auto")
		return stored;
	return "auto";
}

function applyThemeMode(mode: ThemeMode) {
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const resolved = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;

	document.documentElement.classList.remove("light", "dark");
	document.documentElement.classList.add(resolved);

	if (mode === "auto") {
		document.documentElement.removeAttribute("data-theme");
	} else {
		document.documentElement.setAttribute("data-theme", mode);
	}

	document.documentElement.style.colorScheme = resolved;
}

const modeLabels: Record<ThemeMode, string> = {
	light: "Light mode — click for dark",
	dark: "Dark mode — click for system",
	auto: "System mode — click for light",
};

const nextMode: Record<ThemeMode, ThemeMode> = {
	light: "dark",
	dark: "auto",
	auto: "light",
};

export function ThemeToggle() {
	// SSR always starts at "auto" to match server render; corrected post-hydration.
	const [mode, setMode] = useState<ThemeMode>("auto");

	useEffect(() => {
		// Only sync React state — THEME_INIT_SCRIPT already applied the class.
		setMode(getInitialMode());
	}, []);

	useEffect(() => {
		if (mode !== "auto") return;
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyThemeMode("auto");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [mode]);

	function cycle() {
		const next = nextMode[mode];
		setMode(next);
		applyThemeMode(next);
		window.localStorage.setItem("theme", next);
	}

	return (
		// suppressHydrationWarning: server renders "auto" (MonitorIcon visible); client
		// corrects to stored pref in useEffect. The mismatch is intentional and brief.
		<button
			suppressHydrationWarning
			type="button"
			onClick={cycle}
			aria-label={modeLabels[mode]}
			title={modeLabels[mode]}
			className="relative inline-flex size-8 items-center justify-center rounded-lg border border-(--line) bg-transparent text-(--ink-2) transition duration-150 hover:bg-(--surface-2) hover:text-(--ink) active:scale-[0.97]"
		>
			<SunIcon
				className={`absolute size-4.25 transition-opacity duration-150 ${mode === "light" ? "opacity-100" : "opacity-0"}`}
				aria-hidden="true"
			/>
			<MoonIcon
				className={`absolute size-4.25 transition-opacity duration-150 ${mode === "dark" ? "opacity-100" : "opacity-0"}`}
				aria-hidden="true"
			/>
			<MonitorIcon
				className={`absolute size-4.25 transition-opacity duration-150 ${mode === "auto" ? "opacity-100" : "opacity-0"}`}
				aria-hidden="true"
			/>
		</button>
	);
}
