import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { useReducedMotion } from "#/hooks/use-reduced-motion.ts";

export interface FlowTimelineStep {
	label: string;
	title: string;
	detail?: string;
}

function FlowNode({
	step,
	index,
	direction,
}: {
	step: FlowTimelineStep;
	index: number;
	direction: "horizontal" | "vertical";
}) {
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { once: true, margin: "-40px" });
	const reducedMotion = useReducedMotion();
	const visible = reducedMotion || inView;

	return (
		<motion.div
			ref={ref}
			initial={reducedMotion ? false : { opacity: 0, y: 8 }}
			animate={visible ? { opacity: 1, y: 0 } : {}}
			transition={{ duration: 0.4, delay: reducedMotion ? 0 : index * 0.08 }}
			className={
				direction === "horizontal"
					? "flex flex-1 flex-col items-center gap-2 text-center"
					: "flex gap-3"
			}
		>
			<span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-(--brand)/30 bg-(--brand)/10 font-heading text-sm font-semibold text-(--brand)">
				{step.label}
			</span>
			<div className={direction === "horizontal" ? "" : "pt-0.5"}>
				<p className="m-0 text-sm font-semibold text-(--ink)">{step.title}</p>
				{step.detail ? (
					<p className="m-0 text-xs leading-5 text-(--ink-3)">{step.detail}</p>
				) : null}
			</div>
		</motion.div>
	);
}

export function FlowTimeline({
	steps,
	direction,
}: {
	steps: FlowTimelineStep[];
	direction: "horizontal" | "vertical";
}) {
	if (direction === "vertical") {
		return (
			<div className="relative flex flex-col gap-4 pl-1">
				<div className="absolute bottom-4 left-4 top-4 w-px bg-(--line)" />
				{steps.map((step, index) => (
					<FlowNode
						key={step.label + step.title}
						step={step}
						index={index}
						direction="vertical"
					/>
				))}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-2">
			{steps.map((step, index) => (
				<div
					key={step.label + step.title}
					className="flex flex-1 flex-col items-center gap-2 sm:flex-row"
				>
					<FlowNode step={step} index={index} direction="horizontal" />
					{index < steps.length - 1 ? (
						<div className="h-6 w-px bg-(--line) sm:mt-4 sm:h-px sm:w-full sm:flex-1" />
					) : null}
				</div>
			))}
		</div>
	);
}
