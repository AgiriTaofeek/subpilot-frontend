import { animate, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "#/hooks/use-reduced-motion.ts";

export function AnimatedStat({
	value,
	prefix,
	suffix,
	decimals = 0,
	label,
}: {
	value: number;
	prefix?: string;
	suffix?: string;
	decimals?: number;
	label: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { once: true, margin: "-40px" });
	const reducedMotion = useReducedMotion();
	const count = useMotionValue(reducedMotion ? value : 0);
	const rounded = useTransform(count, (v) => v.toFixed(decimals));
	const [display, setDisplay] = useState(rounded.get());

	useEffect(() => {
		const unsubscribe = rounded.on("change", (v) => setDisplay(v));
		return unsubscribe;
	}, [rounded]);

	useEffect(() => {
		if (!inView) return;
		if (reducedMotion) {
			count.set(value);
			return;
		}
		const controls = animate(count, value, { duration: 1.2, ease: "easeOut" });
		return controls.stop;
	}, [inView, reducedMotion, count, value]);

	return (
		<div ref={ref} className="flex flex-col gap-1">
			<p className="m-0 text-2xl font-semibold text-(--pitch-fg)">
				{prefix}
				{display}
				{suffix}
			</p>
			<p className="font-heading m-0 text-[0.65rem] uppercase tracking-wide text-(--pitch-fg-3)">
				{label}
			</p>
		</div>
	);
}
