import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import {
	type SubscriptionStatus,
	subscriptionStatusLabel,
	subscriptionTransitionLabels,
	subscriptionTransitions,
} from "#/data/subscriptions.ts";
import { useReducedMotion } from "#/hooks/use-reduced-motion.ts";

// ─── Layout ────────────────────────────────────────────────────────────────
// Hand-placed positions for the 7 real subscription states. `active` sits at
// the hub since every other state transitions through it; `cancelled` sits
// as the terminal funnel every path can reach.

const nodePositions: Record<SubscriptionStatus, { x: number; y: number }> = {
	trialing: { x: 90, y: 70 },
	suspended: { x: 90, y: 330 },
	active: { x: 320, y: 200 },
	past_due: { x: 520, y: 90 },
	paused: { x: 520, y: 310 },
	cancelled: { x: 650, y: 200 },
	expired: { x: 650, y: 60 },
};

const edges = Object.entries(subscriptionTransitions).flatMap(([from, tos]) =>
	tos.map((to) => ({
		from: from as SubscriptionStatus,
		to,
		label: subscriptionTransitionLabels[`${from}->${to}`],
	})),
);

const tour: SubscriptionStatus[] = [
	"trialing",
	"active",
	"past_due",
	"suspended",
	"active",
	"paused",
	"active",
	"cancelled",
];

const TOUR_INTERVAL_MS = 1800;

function edgeCurve(from: SubscriptionStatus, to: SubscriptionStatus) {
	const p0 = nodePositions[from];
	const p1 = nodePositions[to];
	const dx = p1.x - p0.x;
	const dy = p1.y - p0.y;
	const len = Math.hypot(dx, dy) || 1;
	// Opposite curve direction for the reverse edge of a bidirectional pair.
	const sign = from < to ? 1 : -1;
	const offset = 16 * sign;
	const nx = (-dy / len) * offset;
	const ny = (dx / len) * offset;
	const midX = (p0.x + p1.x) / 2 + nx;
	const midY = (p0.y + p1.y) / 2 + ny;
	const labelX = 0.25 * p0.x + 0.5 * midX + 0.25 * p1.x;
	const labelY = 0.25 * p0.y + 0.5 * midY + 0.25 * p1.y;
	return {
		d: `M ${p0.x} ${p0.y} Q ${midX} ${midY} ${p1.x} ${p1.y}`,
		labelX,
		labelY,
	};
}

export function StateMachineGraph() {
	const reducedMotion = useReducedMotion();
	const [tourIndex, setTourIndex] = useState(0);

	useEffect(() => {
		if (reducedMotion) return;
		const id = setInterval(() => {
			setTourIndex((i) => (i + 1) % tour.length);
		}, TOUR_INTERVAL_MS);
		return () => clearInterval(id);
	}, [reducedMotion]);

	const current = reducedMotion ? "active" : tour[tourIndex];
	const next = reducedMotion ? null : tour[(tourIndex + 1) % tour.length];
	const activeEdgeLabel =
		next && subscriptionTransitions[current]?.includes(next)
			? subscriptionTransitionLabels[`${current}->${next}`]
			: null;

	return (
		<div className="relative">
			<div className="pointer-events-none absolute -inset-10 rounded-full bg-(--brand) opacity-[0.06] blur-3xl" />

			<div className="relative overflow-hidden rounded-2xl border border-(--pitch-line) bg-(--pitch-1) px-2 py-4 shadow-2xl shadow-black/40 sm:px-4">
				<div className="flex items-center justify-between px-3 pb-3">
					<span className="island-kicker text-[0.60rem]">
						Subscription lifecycle · live state machine
					</span>
					<span className="font-heading text-[0.58rem] text-(--pitch-fg-3)">
						7 states
					</span>
				</div>

				<svg
					viewBox="0 0 720 380"
					className="h-auto w-full"
					role="img"
					aria-label="Diagram of every legal subscription state transition"
				>
					<title>Subscription lifecycle state machine</title>
					{edges.map((edge) => {
						const { d, labelX, labelY } = edgeCurve(edge.from, edge.to);
						const isActive =
							!reducedMotion && edge.from === current && edge.to === next;
						return (
							<g key={`${edge.from}->${edge.to}`}>
								<path
									d={d}
									fill="none"
									stroke={isActive ? "var(--brand)" : "var(--pitch-line)"}
									strokeWidth={isActive ? 2.5 : 1.25}
									opacity={isActive ? 1 : 0.45}
									className="transition-[stroke,stroke-width,opacity] duration-500 ease-out"
								/>
								{isActive ? (
									<text
										x={labelX}
										y={labelY}
										textAnchor="middle"
										className="font-heading"
										style={{ fontSize: 10 }}
										fill="var(--brand)"
									>
										{edge.label}
									</text>
								) : null}
							</g>
						);
					})}

					{(Object.keys(nodePositions) as SubscriptionStatus[]).map(
						(status) => {
							const { x, y } = nodePositions[status];
							const isCurrent = status === current;
							return (
								<g key={status}>
									<circle
										cx={x}
										cy={y}
										r={isCurrent ? 11 : 7}
										fill={isCurrent ? "var(--brand)" : "var(--pitch-2)"}
										stroke={isCurrent ? "var(--brand)" : "var(--pitch-line)"}
										strokeWidth={2}
										className="transition-[r,fill,stroke] duration-500 ease-out"
									/>
									<text
										x={x}
										y={y + 26}
										textAnchor="middle"
										className="font-heading transition-[fill] duration-500 ease-out"
										style={{
											fontSize: 10.5,
											fill: isCurrent ? "var(--pitch-fg)" : "var(--pitch-fg-3)",
										}}
									>
										{subscriptionStatusLabel[status]}
									</text>
								</g>
							);
						},
					)}
				</svg>

				{/* Always names the current state plainly, and — only while a
				    transition is animating — adds the destination state and the
				    trigger that causes it, each clearly labeled. Never shows a bare
				    trigger word (e.g. "pause") on its own: on its own it reads like
				    a state name, which is exactly how "pause" got misread as
				    "Paused" before. */}
				<div className="flex min-h-11 flex-col items-center justify-center gap-0.5 px-3 py-1.5">
					<AnimatePresence mode="wait">
						<motion.div
							key={current}
							initial={reducedMotion ? false : { opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
							transition={{ duration: 0.35 }}
							className="flex flex-col items-center gap-0.5"
						>
							<span className="font-heading text-[0.68rem] text-(--pitch-fg)">
								{activeEdgeLabel ? (
									<>
										{subscriptionStatusLabel[current]}
										<span className="mx-1.5 text-(--brand)">→</span>
										{subscriptionStatusLabel[next as SubscriptionStatus]}
									</>
								) : (
									subscriptionStatusLabel[current]
								)}
							</span>
							{activeEdgeLabel ? (
								<span className="font-heading text-[0.58rem] text-(--pitch-fg-3)">
									trigger: {activeEdgeLabel}
								</span>
							) : null}
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
