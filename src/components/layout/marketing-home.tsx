import {
	ArrowRightIcon,
	ChartLineUpIcon,
	CheckCircleIcon,
	CreditCardIcon,
	FrameCornersIcon,
	PlugsConnectedIcon,
	ShieldCheckIcon,
	TreeStructureIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { AnimatedStat } from "#/components/marketing/animated-stat.tsx";
import {
	FlowTimeline,
	type FlowTimelineStep,
} from "#/components/marketing/flow-timeline.tsx";
import { StateMachineGraph } from "#/components/marketing/state-machine-graph.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "#/components/ui/tabs.tsx";
import { useReducedMotion } from "#/hooks/use-reduced-motion.ts";

// ─── Data ────────────────────────────────────────────────────────────────────

const trustItems = [
	"State-machine complete",
	"Multi-tenant",
	"Webhook-ready",
] as const;

const frictionPoints = [
	"Teams rebuild plan models, retries, and billing edge cases from scratch.",
	"Customer self-serve flows get bolted on late and feel unsafe.",
	"Downstream systems still need webhook logs and event visibility.",
] as const;

const operationalWins = [
	"Publish a plan and get a hosted checkout link immediately.",
	"Handle proration, retries, and portal actions inside one operational surface.",
	"Expose API keys, events, and delivery logs without database spelunking.",
] as const;

const flowSteps: FlowTimelineStep[] = [
	{
		label: "1",
		title: "Merchant creates and publishes a plan with a hosted checkout link.",
	},
	{ label: "2", title: "Customer completes checkout through the plan page." },
	{
		label: "3",
		title: "Nomba processes payment and tokenises the card for recurring use.",
	},
	{
		label: "4",
		title:
			"SubPilot activates the subscription and schedules recurring billing.",
	},
	{
		label: "5",
		title:
			"Webhook deliveries notify downstream systems on every state change.",
	},
	{
		label: "6",
		title: "Customer self-serves safely in the portal — invoices, card, plan.",
	},
];

const proofPoints = [
	"State-machine complete from checkout to retry and recovery.",
	"Operational visibility for plans, subscriptions, revenue, and webhooks.",
	"Built for product teams shipping on Nomba, not for generic payment demos.",
	"Merchant dashboard and customer portal designed as one coherent product.",
] as const;

const webhookFeatures = [
	{
		title: "API key management",
		detail:
			"Shown-once reveal, clear labels, and revoke flows for downstream teams.",
		icon: PlugsConnectedIcon,
	},
	{
		title: "Webhook logs",
		detail:
			"Debug delivery outcomes without asking backend engineers to grep logs.",
		icon: TreeStructureIcon,
	},
	{
		title: "Event payload preview",
		detail:
			"Inspect raw event shape inside the product before wiring another consumer.",
		icon: ChartLineUpIcon,
	},
] as const;

// ─── Hero section (full-width, forced dark) ───────────────────────────────────

function HeroSection() {
	return (
		<section className="relative overflow-hidden bg-(--pitch) px-6 pb-20 pt-16 sm:pt-20 sm:pb-24">
			{/* Ambient glow effects */}
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-(--brand)/40 to-transparent" />
				<div className="absolute right-1/3 top-1/2 size-[600px] -translate-y-1/2 translate-x-1/2 rounded-full bg-(--brand) opacity-[0.05] blur-3xl" />
			</div>

			<div className="page-wrap relative">
				<div className="grid gap-14 lg:grid-cols-2 lg:items-center">
					{/* Left column */}
					<div className="flex flex-col gap-8">
						<div className="flex flex-col gap-5">
							<p className="island-kicker m-0">Recurring billing for Nomba</p>

							<h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-(--pitch-fg) sm:text-5xl xl:text-6xl">
								The managed subscription layer Nomba doesn't ship.
							</h1>

							<p className="max-w-lg text-lg leading-8 text-(--pitch-fg-2)">
								Plans, billing cycles, proration, dunning, customer portal, and
								webhooks — operated from a single surface.
							</p>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							<Button
								asChild
								size="lg"
								className="border-0 bg-(--brand) text-(--brand-fg) shadow-[0_0_24px_var(--brand-subtle)] hover:bg-(--brand)/90"
							>
								<Link to="/auth/signup">
									Get started
									<ArrowRightIcon data-icon="inline-end" />
								</Link>
							</Button>
							<Button
								asChild
								size="lg"
								variant="outline"
								className="border-(--pitch-line) bg-transparent text-(--pitch-fg) hover:bg-(--pitch-2) hover:text-(--pitch-fg)"
							>
								<a href="#how-it-works">See how it works</a>
							</Button>
						</div>

						{/* Trust pills */}
						<div className="flex flex-wrap gap-2">
							{trustItems.map((item) => (
								<span
									key={item}
									className="rounded-full border border-(--pitch-line) px-3 py-1.5 font-heading text-[0.65rem] uppercase tracking-wide text-(--pitch-fg-3)"
								>
									{item}
								</span>
							))}
						</div>
					</div>

					{/* Right column */}
					<StateMachineGraph />
				</div>
			</div>
		</section>
	);
}

// ─── Inner product mockups (light/dark adaptive) ──────────────────────────────

function PlanCardMockup() {
	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-(--line) bg-(--surface-1) p-5 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="island-kicker m-0">Growth Plan</p>
					<p className="mt-1 text-xl font-semibold text-(--ink)">
						₦5,000 / month
					</p>
				</div>
				<Badge className="rounded-full border border-(--line) bg-(--surface-2) px-3 py-1 text-xs text-(--brand)">
					Published
				</Badge>
			</div>
			<Separator className="bg-(--line)" />
			<div className="flex flex-col gap-2">
				<p className="text-xs text-(--ink-3)">Hosted checkout link</p>
				<div className="flex items-center gap-2 rounded-xl border border-(--line) bg-(--surface-3) px-3 py-2">
					<span className="flex-1 truncate font-heading text-[0.68rem] text-(--ink-3)">
						/pay/acme-corp/growth-plan
					</span>
					<button
						type="button"
						className="rounded-full border border-(--line) bg-(--surface-2) px-2.5 py-1 text-[0.65rem] font-medium text-(--ink) hover:bg-(--surface-1)"
					>
						Copy
					</button>
				</div>
			</div>
			<div className="flex items-center gap-2 text-xs text-(--ink-3)">
				<CheckCircleIcon className="size-3.5 text-(--brand)" />
				14-day trial · Monthly renewal · Proration: credit
			</div>
		</div>
	);
}

const dunningSteps: FlowTimelineStep[] = [
	{ label: "1", title: "Day 1 — Failed", detail: "Insufficient funds" },
	{ label: "2", title: "Day 3 — Failed", detail: "Card declined" },
	{
		label: "3",
		title: "Day 7 — Retrying",
		detail: "Next attempt scheduled",
	},
];

function DunningMockup() {
	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-(--line) bg-(--surface-1) p-5 shadow-sm">
			<div className="flex items-center gap-2">
				<span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-heading text-[0.65rem] text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
					past_due
				</span>
				<span className="text-sm font-semibold text-(--ink)">
					Acme Growth · ₦5,000
				</span>
			</div>
			<Separator className="bg-(--line)" />
			<FlowTimeline direction="vertical" steps={dunningSteps} />
		</div>
	);
}

function WebhookMockup() {
	const deliveries = [
		{
			event: "subscription.activated",
			status: "200",
			ok: true,
			time: "2m ago",
		},
		{ event: "invoice.paid", status: "200", ok: true, time: "14m ago" },
		{
			event: "subscription.past_due",
			status: "—",
			ok: false,
			time: "Retrying",
		},
	];

	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-(--line) bg-(--surface-1) p-5 shadow-sm">
			<div className="flex items-center justify-between">
				<p className="island-kicker m-0">Webhook deliveries</p>
				<span className="font-heading text-[0.65rem] text-(--ink-3)">
					3 endpoints active
				</span>
			</div>
			<Separator className="bg-(--line)" />
			<div className="flex flex-col gap-2">
				{deliveries.map((d) => (
					<div
						key={d.event}
						className="flex items-center gap-3 rounded-xl border border-(--line) bg-(--surface-2) px-3 py-2"
					>
						<span
							className={[
								"size-1.5 shrink-0 rounded-full",
								d.ok ? "bg-green-500" : "bg-amber-400",
							].join(" ")}
						/>
						<span className="flex-1 truncate font-heading text-[0.68rem] text-(--ink)">
							{d.event}
						</span>
						<span
							className={[
								"font-heading text-[0.65rem]",
								d.ok
									? "text-green-600 dark:text-green-400"
									: "text-amber-600 dark:text-amber-400",
							].join(" ")}
						>
							{d.status}
						</span>
						<span className="font-heading text-[0.62rem] text-(--ink-3)">
							{d.time}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Capability bands ─────────────────────────────────────────────────────────

function CapabilityBands() {
	const bands = [
		{
			eyebrow: "Plans + Billing",
			title: "Billing rules that feel product-ready",
			description:
				"Model real commercial offers instead of stitching together one-off payment flows. Publish a plan and get a hosted checkout link in one step.",
			items: [
				{
					name: "Plan management",
					detail: "Draft and publish offers with hosted checkout links.",
				},
				{
					name: "Flexible billing cycles",
					detail: "Monthly, annual, weekly, or custom intervals.",
				},
				{
					name: "Proration",
					detail:
						"Mid-cycle plan changes show credit or charge amount before confirm.",
				},
			],
			mockup: <PlanCardMockup />,
			reverse: false,
		},
		{
			eyebrow: "Resilience",
			title: "Recovery and self-serve without panic",
			description:
				"Keep payments moving while giving subscribers a safe path to fix issues themselves. Retry timing is visible, not a hidden side effect.",
			items: [
				{
					name: "Dunning + recovery",
					detail:
						"Past-due subscriptions surface retry timing and next action.",
				},
				{
					name: "Customer portal",
					detail:
						"Subscribers can inspect invoices, update card, and change plan in one flow.",
				},
			],
			mockup: <DunningMockup />,
			reverse: true,
		},
		{
			eyebrow: "Integration",
			title: "Operational visibility for downstream teams",
			description:
				"Use SubPilot in the dashboard and integrate it programmatically. Delivery attempts, event payloads, and endpoint scope are visible in-app.",
			items: [
				{
					name: "Webhooks + events",
					detail: "HMAC-signed delivery with retry and forensic logs.",
				},
				{
					name: "API key management",
					detail: "Shown-once reveal, labels, and instant revoke.",
				},
			],
			mockup: <WebhookMockup />,
			reverse: false,
		},
	];

	return (
		<div className="flex flex-col gap-6">
			{bands.map((band) => (
				<div
					key={band.title}
					className={[
						"grid items-center gap-8 rounded-2xl border border-(--line) bg-(--surface-1) p-6 sm:p-8 lg:grid-cols-2",
						band.reverse ? "lg:[&>*:first-child]:order-2" : "",
					].join(" ")}
				>
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-3">
							<p className="island-kicker m-0">{band.eyebrow}</p>
							<h3 className="text-2xl font-semibold tracking-tight text-(--ink) sm:text-3xl">
								{band.title}
							</h3>
							<p className="m-0 text-base leading-7 text-(--ink-2)">
								{band.description}
							</p>
						</div>
						<div className="flex flex-col gap-3">
							{band.items.map((item) => (
								<div key={item.name} className="flex gap-3">
									<CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-(--brand)" />
									<div>
										<span className="text-sm font-semibold text-(--ink)">
											{item.name}
										</span>
										<span className="text-sm text-(--ink-2)">
											{" "}
											— {item.detail}
										</span>
									</div>
								</div>
							))}
						</div>
					</div>
					<div className="relative">
						<span className="pointer-events-none absolute top-3 right-3 z-10 rounded-full border border-(--line) bg-(--surface-1)/80 px-2 py-0.5 font-heading text-[0.6rem] tracking-wide text-(--ink-3) backdrop-blur-sm">
							Sample
						</span>
						{band.mockup}
					</div>
				</div>
			))}
		</div>
	);
}

// ─── Product showcase tabs ────────────────────────────────────────────────────

function ProductShowcase() {
	return (
		<Tabs defaultValue="dashboard" className="gap-5">
			<TabsList
				variant="line"
				className="w-full justify-start gap-4 border-b border-(--line) px-0"
			>
				<TabsTrigger value="dashboard">Merchant dashboard</TabsTrigger>
				<TabsTrigger value="portal">Customer portal</TabsTrigger>
			</TabsList>

			<TabsContent value="dashboard">
				<div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
					<Card className="border border-(--line) bg-(--surface-1) py-0 shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-2xl normal-case tracking-tight text-(--ink)">
								Operations in one surface
							</CardTitle>
							<CardDescription className="text-(--ink-2)">
								Plans, subscriptions, revenue, and delivery logs stay in the
								same calm shell.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 px-5 pb-5">
							{[
								{
									title: "Plans",
									detail:
										"Create and publish offers with hosted checkout links.",
								},
								{
									title: "Subscriptions",
									detail:
										"See trialing, active, and past-due states with next action visibility.",
								},
								{
									title: "Revenue",
									detail: "Track gross, fees, and net without exporting first.",
								},
								{
									title: "Webhook logs",
									detail:
										"Inspect endpoint health and delivery outcomes without guessing.",
								},
							].map((item) => (
								<div
									key={item.title}
									className="rounded-2xl border border-(--line) bg-(--surface-2) px-4 py-4"
								>
									<p className="m-0 text-sm font-semibold text-(--ink)">
										{item.title}
									</p>
									<p className="mt-1 text-sm text-(--ink-2)">{item.detail}</p>
								</div>
							))}
						</CardContent>
					</Card>

					<Card className="border border-(--surface-invert-edge) bg-(--surface-invert) py-0 shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-xl normal-case tracking-tight text-(--ink-invert)">
								Why it feels operational
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 px-5 pb-5 text-sm text-(--ink-invert-2)">
							<div className="flex items-start gap-3">
								<FrameCornersIcon className="mt-0.5 size-4 text-(--brand)" />
								<p className="m-0">
									One dominant health view, then supporting metrics.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<TreeStructureIcon className="mt-0.5 size-4 text-(--brand)" />
								<p className="m-0">
									Retries and dunning are visible as workflows, not hidden side
									effects.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<ChartLineUpIcon className="mt-0.5 size-4 text-(--brand)" />
								<p className="m-0">
									Revenue and fees stay legible enough for real operators to
									trust.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</TabsContent>

			<TabsContent value="portal">
				<div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
					<Card className="border border-(--line) bg-(--surface-1) py-0 shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-2xl normal-case tracking-tight text-(--ink)">
								Self-serve without anxiety
							</CardTitle>
							<CardDescription className="text-(--ink-2)">
								Subscribers can inspect status, invoices, card updates, and plan
								changes in one low-stress flow.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 px-5 pb-5">
							{[
								"Current subscription status and next billing date are always visible first.",
								"Changing plan shows proration outcome before confirmation.",
								"Card updates hand off to a secure Nomba flow, then return to a calm success state.",
								"Invoice history stays simple and trustworthy on desktop and mobile.",
							].map((line) => (
								<div
									key={line}
									className="rounded-2xl border border-(--line) bg-(--surface-2) px-4 py-4 text-sm text-(--ink-2)"
								>
									{line}
								</div>
							))}
						</CardContent>
					</Card>

					<Card className="border border-(--line) bg-(--surface-2) py-0 shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-xl normal-case tracking-tight text-(--ink)">
								Trust cues
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 px-5 pb-5 text-sm text-(--ink-2)">
							<div className="flex items-start gap-3">
								<ShieldCheckIcon className="mt-0.5 size-4 text-(--brand)" />
								<p className="m-0">
									Actions explain what happens next before the user confirms.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<CreditCardIcon className="mt-0.5 size-4 text-(--brand)" />
								<p className="m-0">
									Sensitive payment flows use secure handoff language instead of
									vague redirects.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<TreeStructureIcon className="mt-0.5 size-4 text-(--brand)" />
								<p className="m-0">
									The portal is part of the same product language, not a
									disconnected rescue screen.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</TabsContent>
		</Tabs>
	);
}

// ─── Developer integration (full-bleed dark pitch band) ───────────────────────

function WebhooksSection() {
	return (
		<section
			id="webhooks"
			className="relative scroll-mt-24 overflow-hidden bg-(--pitch) px-6 py-14 sm:py-16"
		>
			<div className="page-wrap flex flex-col gap-8">
				<div className="max-w-2xl flex flex-col gap-3">
					<p className="island-kicker m-0">Developer integration</p>
					<h2 className="text-3xl font-semibold tracking-tight text-(--pitch-fg) sm:text-4xl">
						Operate in the dashboard, integrate with API keys and webhooks.
					</h2>
					<p className="m-0 text-base leading-7 text-(--pitch-fg-2) sm:text-lg">
						The product exposes the technical surfaces teams need to automate
						against it — delivery logs, event payloads, and revokable API keys.
					</p>
					<Link
						to="/docs"
						className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-(--brand) no-underline hover:underline"
					>
						View the full API reference
						<ArrowRightIcon data-icon="inline-end" />
					</Link>
				</div>

				<div className="flex flex-col gap-3 rounded-2xl border border-(--pitch-line) bg-(--pitch-1) px-6 py-6">
					<div className="grid gap-6 sm:grid-cols-3">
						<AnimatedStat value={1284} label="Active subscriptions" />
						<AnimatedStat
							value={12.4}
							decimals={1}
							prefix="₦"
							suffix="M"
							label="Net revenue / 30d"
						/>
						<AnimatedStat
							value={99.98}
							decimals={2}
							suffix="%"
							label="Webhook delivery"
						/>
					</div>
					<p className="m-0 text-xs text-(--pitch-fg-3)">
						Illustrative example — every new SubPilot dashboard starts at zero.
					</p>
				</div>

				<div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
					<Card className="border border-(--pitch-line) bg-(--pitch-2) py-0 shadow-none">
						<CardHeader className="px-5 py-5">
							<div className="flex items-center gap-2">
								<CardTitle className="font-sans text-xl normal-case tracking-tight text-(--pitch-fg)">
									API keys + event visibility
								</CardTitle>
								<Badge
									variant="outline"
									className="border-(--pitch-line) text-(--pitch-fg-3)"
								>
									Sample data
								</Badge>
							</div>
							<CardDescription className="text-(--pitch-fg-2)">
								Use SubPilot operationally in the dashboard, then wire it into
								downstream systems cleanly.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 px-5 pb-5">
							<div className="rounded-2xl border border-(--pitch-line) bg-(--pitch) px-4 py-4">
								<p className="island-kicker m-0 text-[0.60rem] opacity-70">
									API key reveal
								</p>
								<p className="mt-2 font-heading text-sm tracking-wide text-(--pitch-fg)">
									sk_live_subpilot_production_****
								</p>
							</div>
							<div className="rounded-2xl border border-(--pitch-line) bg-(--pitch) px-4 py-4">
								<p className="island-kicker m-0 text-[0.60rem] opacity-70">
									Webhook deliveries
								</p>
								<div className="mt-2 flex flex-col gap-1">
									<p className="text-sm text-(--pitch-fg)">
										subscription.activated
										<span className="ml-2 text-green-400">200 OK</span>
									</p>
									<p className="text-sm text-(--pitch-fg-2)">
										subscription.past_due
										<span className="ml-2 text-amber-400">retrying</span>
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="grid gap-4">
						{webhookFeatures.map((item) => (
							<Card
								key={item.title}
								className="border border-(--pitch-line) bg-(--pitch-2) py-0 shadow-none"
							>
								<CardContent className="flex items-start gap-4 px-5 py-5">
									<span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-(--brand)/20 bg-(--brand)/10 text-(--brand)">
										<item.icon className="size-5" />
									</span>
									<div className="flex flex-col gap-1">
										<p className="m-0 text-sm font-semibold text-(--pitch-fg)">
											{item.title}
										</p>
										<p className="m-0 text-sm leading-6 text-(--pitch-fg-2)">
											{item.detail}
										</p>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

const sectionRevealVariants = {
	hidden: {},
	show: { transition: { staggerChildren: 0.1 } },
};

const sectionItemVariants = {
	hidden: { opacity: 0, y: 16 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
	},
};

function Section({
	id,
	eyebrow,
	title,
	description,
	children,
}: {
	id?: string;
	eyebrow: string;
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	const ref = useRef<HTMLElement>(null);
	const inView = useInView(ref, { once: true, margin: "-80px" });
	const reducedMotion = useReducedMotion();
	const visible = reducedMotion || inView;

	return (
		<motion.section
			ref={ref}
			id={id}
			className="flex scroll-mt-24 flex-col gap-6 py-10 sm:py-14"
			initial={reducedMotion ? "show" : "hidden"}
			animate={visible ? "show" : "hidden"}
			variants={sectionRevealVariants}
		>
			<div className="max-w-2xl flex flex-col gap-3">
				<motion.p variants={sectionItemVariants} className="island-kicker m-0">
					{eyebrow}
				</motion.p>
				<motion.h2
					variants={sectionItemVariants}
					className="text-3xl font-semibold tracking-tight text-(--ink) sm:text-4xl"
				>
					{title}
				</motion.h2>
				<motion.p
					variants={sectionItemVariants}
					className="m-0 text-base leading-7 text-(--ink-2) sm:text-lg"
				>
					{description}
				</motion.p>
			</div>
			<motion.div variants={sectionItemVariants}>{children}</motion.div>
		</motion.section>
	);
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function MarketingHome() {
	return (
		<>
			{/* Hero — full-width forced dark, outside page-wrap */}
			<HeroSection />

			{/* Content sections — theme-adaptive, inside page-wrap */}
			<div className="px-6">
				<div className="page-wrap">
					<Section
						id="product"
						eyebrow="Why this exists"
						title="Nomba tokenizes the card and charges it on demand. It doesn't run the subscription on top."
						description="Plans, billing schedules, retries, proration, and trials are still yours to build — usually as a cron job charging a saved token and hoping nothing drifts. SubPilot is that layer, already built."
					>
						<div className="grid gap-4 lg:grid-cols-2">
							<Card className="border border-(--line) bg-(--surface-1) py-0 shadow-none">
								<CardHeader className="px-5 py-5">
									<CardTitle className="font-sans text-2xl normal-case tracking-tight text-(--ink)">
										Without SubPilot
									</CardTitle>
									<CardDescription className="text-(--ink-2)">
										Subscription logic spreads across backend code, support
										workflows, and internal guesswork.
									</CardDescription>
								</CardHeader>
								<CardContent className="grid gap-3 px-5 pb-5">
									{frictionPoints.map((item) => (
										<div
											key={item}
											className="rounded-2xl border border-(--line) bg-(--surface-2) px-4 py-4 text-sm text-(--ink-2)"
										>
											{item}
										</div>
									))}
								</CardContent>
							</Card>

							<Card className="border border-(--surface-invert-edge) bg-(--surface-invert) py-0 shadow-none">
								<CardHeader className="px-5 py-5">
									<CardTitle className="font-sans text-2xl normal-case tracking-tight text-(--ink-invert)">
										With SubPilot
									</CardTitle>
									<CardDescription className="text-(--ink-invert-2)">
										One product surface for plan publishing, recurring billing,
										portal actions, and integration visibility.
									</CardDescription>
								</CardHeader>
								<CardContent className="grid gap-3 px-5 pb-5">
									{operationalWins.map((item) => (
										<div
											key={item}
											className="rounded-2xl border border-(--surface-invert-edge) bg-(--surface-invert-2) px-4 py-4 text-sm text-(--ink-invert-2)"
										>
											{item}
										</div>
									))}
								</CardContent>
							</Card>
						</div>
					</Section>

					<Section
						eyebrow="Capabilities"
						title="The hard parts of subscriptions are visible, not hidden."
						description="Each capability is tied to a real operational proof point — workflows you can see in the product, not feature bullets."
					>
						<CapabilityBands />
					</Section>

					<Section
						id="how-it-works"
						eyebrow="How it works"
						title="The flow stays understandable from plan creation to recurring billing."
						description="A merchant, engineer, or evaluator can picture the full lifecycle in one scan."
					>
						<div className="rounded-2xl border border-(--line) bg-(--surface-1) p-6 sm:p-8">
							<FlowTimeline direction="horizontal" steps={flowSteps} />
						</div>
					</Section>

					<Section
						id="portal"
						eyebrow="Product walkthrough"
						title="Merchants and subscribers both get purposeful surfaces."
						description="The merchant dashboard stays operational. The portal stays safe and low-stress. Both come from the same design language."
					>
						<ProductShowcase />
					</Section>
				</div>
			</div>

			{/* Developer integration — full-width dark pitch band, breaks the
			    monotony of an all-light middle section of the page */}
			<WebhooksSection />

			<div className="px-6">
				<div className="page-wrap">
					<Section
						id="proof"
						eyebrow="Trust signals"
						title="Even without customer logos, the product should feel technically serious."
						description="The page earns trust through specificity, believable operational previews, and a clear sense that both the merchant and subscriber surfaces were designed with care."
					>
						<div className="grid gap-3 sm:grid-cols-2">
							{proofPoints.map((item) => (
								<div
									key={item}
									className="flex gap-3 rounded-2xl border border-(--line) bg-(--surface-1) px-4 py-4 text-sm leading-6 text-(--ink-2)"
								>
									<CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-(--brand)" />
									{item}
								</div>
							))}
						</div>
					</Section>

					{/* Final CTA */}
					<section className="rise-in py-10">
						<div className="overflow-hidden rounded-2xl border border-(--pitch-line) bg-(--pitch-1) px-6 py-10 sm:px-10 sm:py-14">
							<div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
								<div className="flex flex-col gap-3">
									<p className="island-kicker m-0 opacity-70">
										Ready to ship recurring billing
									</p>
									<h2 className="text-3xl font-semibold tracking-tight text-(--pitch-fg) sm:text-4xl">
										Stop rebuilding subscriptions.
									</h2>
									<p className="m-0 max-w-xl text-base leading-7 text-(--pitch-fg-2)">
										Start with hosted plans, visible retries, and a portal your
										customers can actually trust.
									</p>
								</div>
								<div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
									<Button
										asChild
										size="lg"
										className="border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
									>
										<Link to="/auth/signup">Get started</Link>
									</Button>
									<Button
										asChild
										size="lg"
										variant="outline"
										className="border-(--pitch-line) bg-transparent text-(--pitch-fg) hover:bg-(--pitch-2) hover:text-(--pitch-fg)"
									>
										<Link to="/auth/login">Sign in</Link>
									</Button>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>

			<Separator className="bg-(--line)" />
		</>
	);
}
