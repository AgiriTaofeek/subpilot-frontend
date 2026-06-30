import {
	ArrowRightIcon,
	BellRingingIcon,
	ChartLineUpIcon,
	CheckCircleIcon,
	CreditCardIcon,
	FrameCornersIcon,
	PlugsConnectedIcon,
	ShieldCheckIcon,
	TreeStructureIcon,
} from "@phosphor-icons/react"

import { Badge } from "#/components/ui/badge.tsx"
import { Button } from "#/components/ui/button.tsx"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx"
import { Separator } from "#/components/ui/separator.tsx"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "#/components/ui/tabs.tsx"

const trustItems = [
	"Built on Nomba Checkout + tokenised cards",
	"Multi-tenant",
	"Webhook-ready",
] as const

const frictionPoints = [
	"Teams rebuild plan models, retries, and billing edge cases from scratch.",
	"Customer self-serve flows get bolted on late and feel unsafe.",
	"Downstream systems still need webhook logs and event visibility.",
] as const

const operationalWins = [
	"Publish a plan and get a hosted checkout link immediately.",
	"Handle proration, retries, and portal actions inside one operational surface.",
	"Expose API keys, events, and delivery logs without database spelunking.",
] as const

const flowSteps = [
	"Merchant creates and publishes a plan.",
	"Customer checks out through a hosted plan page.",
	"Nomba processes payment and tokenises the card.",
	"SubPilot activates the subscription and schedules recurring billing.",
	"Webhook deliveries notify downstream systems.",
	"Customer self-serves safely in the portal.",
] as const

const proofPoints = [
	"State-machine complete from checkout to retry and recovery.",
	"Operational visibility for plans, subscriptions, revenue, and webhooks.",
	"Built for product teams shipping on Nomba, not for generic payment demos.",
	"Merchant dashboard and customer portal planned as one coherent frontend.",
] as const

function Section({
	id,
	eyebrow,
	title,
	description,
	children,
}: {
	id?: string
	eyebrow: string
	title: string
	description: string
	children: React.ReactNode
}) {
	return (
		<section id={id} className="rise-in space-y-6 py-8 sm:py-10">
			<div className="max-w-2xl space-y-3">
				<p className="island-kicker m-0">{eyebrow}</p>
				<h2 className="text-3xl font-semibold tracking-tight text-(--sea-ink) sm:text-4xl">
					{title}
				</h2>
				<p className="m-0 text-base leading-7 text-(--sea-ink-soft) sm:text-lg">
					{description}
				</p>
			</div>
			{children}
		</section>
	)
}

function HeroPreview() {
	return (
		<div className="island-shell feature-card rise-in relative overflow-hidden rounded-[2rem] border border-(--line) p-4 sm:p-5">
			<div className="pointer-events-none absolute inset-x-10 -top-16 h-28 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.22),transparent_72%)] blur-2xl" />
			<div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
				<Card className="border border-(--line) bg-white/80 py-0 shadow-none">
					<CardHeader className="border-b border-(--line) px-5 py-4">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="island-kicker m-0">Subscription health</p>
								<CardTitle className="font-sans text-2xl normal-case tracking-tight text-(--sea-ink)">
									1,284 active subscriptions
								</CardTitle>
							</div>
							<Badge className="text-(--palm)">2 past due</Badge>
						</div>
						<CardDescription>
							Revenue is steady, two retries need attention, and webhook
							deliveries are healthy.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 px-5 py-5 sm:grid-cols-3">
						{[
							["Net last 30 days", "₦12.4M"],
							["Recoveries in progress", "8 subscriptions"],
							["Webhook success rate", "99.98%"],
						].map(([label, value]) => (
							<div
								key={label}
								className="rounded-2xl border border-(--line) bg-(--foam)/80 p-4"
							>
								<p className="island-kicker m-0">{label}</p>
								<p className="mt-2 text-lg font-semibold text-(--sea-ink)">
									{value}
								</p>
							</div>
						))}
					</CardContent>
				</Card>

				<div className="grid gap-4">
					<Card className="border border-(--line) bg-white/78 py-0 shadow-none">
						<CardHeader className="px-5 py-4">
							<CardTitle className="font-sans text-lg normal-case tracking-tight text-(--sea-ink)">
								Past due queue
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 px-5 pb-5">
							{[
								["Acme Growth", "Retry in 6 hours"],
								["Retail Ops Annual", "Card update requested"],
							].map(([name, status]) => (
								<div
									key={name}
									className="flex items-center justify-between gap-3 rounded-2xl border border-(--line) bg-(--sand)/65 px-3 py-3"
								>
									<div>
										<p className="m-0 text-sm font-semibold text-(--sea-ink)">
											{name}
										</p>
										<p className="m-0 text-xs text-(--sea-ink-soft)">{status}</p>
									</div>
									<BellRingingIcon className="size-4 text-(--lagoon-deep)" />
								</div>
							))}
						</CardContent>
					</Card>

					<Card className="border border-(--line) bg-white/78 py-0 shadow-none">
						<CardHeader className="px-5 py-4">
							<CardTitle className="font-sans text-lg normal-case tracking-tight text-(--sea-ink)">
								Recent webhook deliveries
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 px-5 pb-5">
							{[
								["subscription.activated", "200 OK", true],
								["invoice.paid", "200 OK", true],
								["subscription.past_due", "Retrying", false],
							].map(([eventName, result, ok]) => (
								<div
									key={eventName as string}
									className="flex items-center justify-between gap-3 text-sm"
								>
									<span className="font-heading text-xs text-(--sea-ink)">
										{eventName}
									</span>
									<span
										className={
											ok
												? "text-xs text-green-600"
												: "text-xs text-amber-600"
										}
									>
										{result}
									</span>
								</div>
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}

function PlanCardMockup() {
	return (
		<div className="space-y-3 rounded-2xl border border-(--line) bg-white/85 p-5 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="island-kicker m-0">Growth Plan</p>
					<p className="mt-1 text-xl font-semibold text-(--sea-ink)">
						₦5,000 / month
					</p>
				</div>
				<Badge className="rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1 text-xs text-(--palm)">
					Published
				</Badge>
			</div>
			<Separator className="bg-(--line)" />
			<div className="space-y-2">
				<p className="text-xs text-(--sea-ink-soft)">Hosted checkout link</p>
				<div className="flex items-center gap-2 rounded-xl border border-(--line) bg-(--surface-strong) px-3 py-2">
					<span className="font-heading flex-1 truncate text-[0.68rem] text-(--sea-ink-soft)">
						/pay/acme-corp/growth-plan
					</span>
					<button
						type="button"
						className="rounded-full border border-(--chip-line) bg-(--chip-bg) px-2.5 py-1 text-[0.65rem] font-medium text-(--sea-ink) hover:bg-white/80"
					>
						Copy
					</button>
				</div>
			</div>
			<div className="flex items-center gap-2 text-xs text-(--sea-ink-soft)">
				<CheckCircleIcon className="size-3.5 text-(--palm)" />
				14-day trial · Monthly renewal · Proration: credit
			</div>
		</div>
	)
}

function DunningMockup() {
	const retries = [
		{ day: "Day 1", result: "Failed", reason: "Insufficient funds" },
		{ day: "Day 3", result: "Failed", reason: "Card declined" },
		{ day: "Day 7", result: "Retrying", reason: "Next attempt scheduled" },
	]

	return (
		<div className="space-y-3 rounded-2xl border border-(--line) bg-white/85 p-5 shadow-sm">
			<div className="flex items-center gap-2">
				<span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-heading text-[0.65rem] text-amber-700">
					past_due
				</span>
				<span className="text-sm font-semibold text-(--sea-ink)">
					Acme Growth · ₦5,000
				</span>
			</div>
			<Separator className="bg-(--line)" />
			<div className="relative space-y-3 pl-5">
				<div className="absolute bottom-0 left-2 top-0 w-px bg-(--line)" />
				{retries.map((retry) => (
					<div key={retry.day} className="relative flex gap-3">
						<span className="absolute -left-4.25 mt-1.5 size-2.5 rounded-full border border-(--chip-line) bg-(--chip-bg)" />
						<div>
							<p className="m-0 text-xs font-semibold text-(--sea-ink)">
								{retry.day} — {retry.result}
							</p>
							<p className="m-0 text-xs text-(--sea-ink-soft)">{retry.reason}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

function WebhookMockup() {
	const deliveries = [
		{ event: "subscription.activated", status: "200", ok: true, time: "2m ago" },
		{ event: "invoice.paid", status: "200", ok: true, time: "14m ago" },
		{ event: "subscription.past_due", status: "—", ok: false, time: "Retrying" },
	]

	return (
		<div className="space-y-3 rounded-2xl border border-(--line) bg-white/85 p-5 shadow-sm">
			<div className="flex items-center justify-between">
				<p className="island-kicker m-0">Webhook deliveries</p>
				<span className="font-heading text-[0.65rem] text-(--sea-ink-soft)">
					3 endpoints active
				</span>
			</div>
			<Separator className="bg-(--line)" />
			<div className="space-y-2">
				{deliveries.map((d) => (
					<div
						key={d.event}
						className="flex items-center gap-3 rounded-xl border border-(--line) bg-(--surface-strong) px-3 py-2"
					>
						<span
							className={[
								"size-1.5 shrink-0 rounded-full",
								d.ok ? "bg-green-500" : "bg-amber-400",
							].join(" ")}
						/>
						<span className="font-heading flex-1 truncate text-[0.68rem] text-(--sea-ink)">
							{d.event}
						</span>
						<span
							className={[
								"font-heading text-[0.65rem]",
								d.ok ? "text-green-600" : "text-amber-600",
							].join(" ")}
						>
							{d.status}
						</span>
						<span className="font-heading text-[0.62rem] text-(--sea-ink-soft)">
							{d.time}
						</span>
					</div>
				))}
			</div>
		</div>
	)
}

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
					detail: "Past-due subscriptions surface retry timing and next action.",
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
	]

	return (
		<div className="space-y-8">
			{bands.map((band) => (
				<div
					key={band.title}
					className={[
						"grid items-center gap-8 rounded-[2rem] border border-(--line) bg-white/50 p-6 sm:p-8 lg:grid-cols-2",
						band.reverse ? "lg:[&>*:first-child]:order-2" : "",
					].join(" ")}
				>
					<div className="space-y-5">
						<div className="space-y-3">
							<p className="island-kicker m-0">{band.eyebrow}</p>
							<h3 className="text-2xl font-semibold tracking-tight text-(--sea-ink) sm:text-3xl">
								{band.title}
							</h3>
							<p className="m-0 text-base leading-7 text-(--sea-ink-soft)">
								{band.description}
							</p>
						</div>
						<div className="space-y-3">
							{band.items.map((item) => (
								<div key={item.name} className="flex gap-3">
									<CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-(--palm)" />
									<div>
										<span className="text-sm font-semibold text-(--sea-ink)">
											{item.name}
										</span>
										<span className="text-sm text-(--sea-ink-soft)">
											{" "}
											— {item.detail}
										</span>
									</div>
								</div>
							))}
						</div>
					</div>
					<div>{band.mockup}</div>
				</div>
			))}
		</div>
	)
}

function ProductShowcase() {
	return (
		<Tabs defaultValue="dashboard" className="gap-5">
			<TabsList
				variant="line"
				className="w-full justify-start gap-4 border-b border-(--line) px-0 pb-2"
			>
				<TabsTrigger value="dashboard">Merchant dashboard</TabsTrigger>
				<TabsTrigger value="portal">Customer portal</TabsTrigger>
			</TabsList>

			<TabsContent value="dashboard">
				<div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
					<Card className="feature-card border border-(--line) bg-white/74 py-0 shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-2xl normal-case tracking-tight text-(--sea-ink)">
								Operations in one surface
							</CardTitle>
							<CardDescription>
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
									detail:
										"Track gross, fees, and net without exporting first.",
								},
								{
									title: "Webhook logs",
									detail:
										"Inspect endpoint health and delivery outcomes without guessing.",
								},
							].map((item) => (
								<div
									key={item.title}
									className="rounded-2xl border border-(--line) bg-(--surface-strong) px-4 py-4"
								>
									<p className="m-0 text-sm font-semibold text-(--sea-ink)">
										{item.title}
									</p>
									<p className="mt-1 text-sm text-(--sea-ink-soft)">
										{item.detail}
									</p>
								</div>
							))}
						</CardContent>
					</Card>

					<Card className="border border-(--line) bg-(--sea-ink) py-0 text-white shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-xl normal-case tracking-tight text-white">
								Why it feels operational
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4 px-5 pb-5 text-sm text-white/80">
							<div className="flex items-start gap-3">
								<FrameCornersIcon className="mt-0.5 size-4 text-(--lagoon)" />
								<p className="m-0">
									One dominant health view, then supporting metrics.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<TreeStructureIcon className="mt-0.5 size-4 text-(--lagoon)" />
								<p className="m-0">
									Retries and dunning are visible as workflows, not hidden side
									effects.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<ChartLineUpIcon className="mt-0.5 size-4 text-(--lagoon)" />
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
					<Card className="feature-card border border-(--line) bg-white/74 py-0 shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-2xl normal-case tracking-tight text-(--sea-ink)">
								Self-serve without anxiety
							</CardTitle>
							<CardDescription>
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
									className="rounded-2xl border border-(--line) bg-(--surface-strong) px-4 py-4 text-sm text-(--sea-ink-soft)"
								>
									{line}
								</div>
							))}
						</CardContent>
					</Card>

					<Card className="border border-(--line) bg-(--foam) py-0 shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-xl normal-case tracking-tight text-(--sea-ink)">
								Trust cues
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4 px-5 pb-5 text-sm text-(--sea-ink-soft)">
							<div className="flex items-start gap-3">
								<ShieldCheckIcon className="mt-0.5 size-4 text-(--palm)" />
								<p className="m-0">
									Actions explain what happens next before the user confirms.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<CreditCardIcon className="mt-0.5 size-4 text-(--palm)" />
								<p className="m-0">
									Sensitive payment flows use secure handoff language instead of
									vague redirects.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<TreeStructureIcon className="mt-0.5 size-4 text-(--palm)" />
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
	)
}

export default function MarketingHome() {
	return (
		<main className="page-wrap px-0 pb-8 pt-10 sm:pt-14">
			<section className="rise-in grid gap-8 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
				<div className="space-y-6">
					<div className="space-y-4">
						<p className="island-kicker m-0">Recurring billing for Nomba</p>
						<h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-(--sea-ink) sm:text-5xl lg:text-6xl">
							Recurring billing for Nomba, without rebuilding the whole
							subscriptions stack.
						</h1>
						<p className="max-w-2xl text-base leading-7 text-(--sea-ink-soft) sm:text-lg">
							Publish plans, run flexible billing cycles, handle proration and
							dunning, give customers a safe portal, and keep downstream systems
							synced with webhooks.
						</p>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row">
						<Button
							asChild
							size="lg"
							className="border border-transparent bg-(--sea-ink) text-white hover:bg-[color-mix(in_oklab,var(--sea-ink),black_8%)]"
						>
							<a href="/auth/signup">
								Get started
								<ArrowRightIcon className="size-4" />
							</a>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="border-(--line) bg-white/70"
						>
							<a href="#how-it-works">See how it works</a>
						</Button>
					</div>

					<div className="flex flex-wrap gap-3">
						{trustItems.map((item) => (
							<Badge
								key={item}
								className="rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5 text-[0.68rem] text-(--sea-ink) shadow-[0_8px_22px_rgba(30,90,72,0.08)]"
							>
								{item}
							</Badge>
						))}
					</div>
				</div>

				<HeroPreview />
			</section>

			<Section
				id="product"
				eyebrow="Why this exists"
				title="Nomba gives you payment primitives. It does not give you the managed subscription layer."
				description="SubPilot exists so product teams stop rebuilding plan models, retries, subscriber self-serve, and downstream event visibility from scratch."
			>
				<div className="grid gap-4 lg:grid-cols-2">
					<Card className="border border-(--line) bg-white/70 py-0 shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-2xl normal-case tracking-tight text-(--sea-ink)">
								Without SubPilot
							</CardTitle>
							<CardDescription>
								Subscription logic spreads across backend code, support
								workflows, and internal guesswork.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 px-5 pb-5">
							{frictionPoints.map((item) => (
								<div
									key={item}
									className="rounded-2xl border border-(--line) bg-(--surface-strong) px-4 py-4 text-sm text-(--sea-ink-soft)"
								>
									{item}
								</div>
							))}
						</CardContent>
					</Card>

					<Card className="feature-card border border-(--line) bg-(--sea-ink) py-0 text-white shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-2xl normal-case tracking-tight text-white">
								With SubPilot
							</CardTitle>
							<CardDescription className="text-white/75">
								One product surface for plan publishing, recurring billing,
								portal actions, and integration visibility.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 px-5 pb-5">
							{operationalWins.map((item) => (
								<div
									key={item}
									className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-sm text-white/80"
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
				description="Each capability is tied to a real operational proof point. These are not feature bullets — they are workflows you can see in the product."
			>
				<CapabilityBands />
			</Section>

			<Section
				id="how-it-works"
				eyebrow="How it works"
				title="The flow stays understandable from plan creation to recurring billing."
				description="The page should help a merchant, judge, or engineer picture the full lifecycle in one scan."
			>
				<div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
					<Card className="border border-(--line) bg-white/74 py-0 shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-xl normal-case tracking-tight text-(--sea-ink)">
								System path
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4 px-5 pb-5 text-sm text-(--sea-ink-soft)">
							<p className="m-0">Merchant dashboard</p>
							<ArrowRightIcon className="size-4 text-(--lagoon-deep)" />
							<p className="m-0">Hosted checkout</p>
							<ArrowRightIcon className="size-4 text-(--lagoon-deep)" />
							<p className="m-0">Nomba payment + tokenisation</p>
							<ArrowRightIcon className="size-4 text-(--lagoon-deep)" />
							<p className="m-0">Subscription activation</p>
							<ArrowRightIcon className="size-4 text-(--lagoon-deep)" />
							<p className="m-0">Webhooks + customer portal</p>
						</CardContent>
					</Card>

					<div className="grid gap-3">
						{flowSteps.map((step, index) => (
							<div
								key={step}
								className="flex gap-4 rounded-2xl border border-(--line) bg-white/74 px-4 py-4"
							>
								<div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-(--chip-line) bg-(--chip-bg) font-heading text-sm font-semibold text-(--sea-ink)">
									{index + 1}
								</div>
								<p className="m-0 text-sm leading-6 text-(--sea-ink-soft)">
									{step}
								</p>
							</div>
						))}
					</div>
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

			<Section
				id="webhooks"
				eyebrow="Developer integration"
				title="Operate in the dashboard, integrate with API keys and webhooks."
				description="The product exposes the technical surfaces teams need to automate against it — delivery logs, event payloads, and revokable API keys."
			>
				<div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
					<Card className="border border-(--line) bg-(--sea-ink) py-0 text-white shadow-none">
						<CardHeader className="px-5 py-5">
							<CardTitle className="font-sans text-xl normal-case tracking-tight text-white">
								API keys + event visibility
							</CardTitle>
							<CardDescription className="text-white/75">
								Use SubPilot operationally in the dashboard, then wire it into
								downstream systems cleanly.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 px-5 pb-5">
							<div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
								<p className="island-kicker m-0 text-white/60">API key reveal</p>
								<p className="mt-2 font-heading text-sm tracking-wide text-white">
									sk_live_subpilot_production_****
								</p>
							</div>
							<div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
								<p className="island-kicker m-0 text-white/60">
									Webhook deliveries
								</p>
								<p className="mt-2 text-sm text-white/85">
									subscription.activated 200 OK
								</p>
								<p className="mt-1 text-sm text-white/70">
									subscription.past_due retrying
								</p>
							</div>
						</CardContent>
					</Card>

					<div className="grid gap-4">
						{[
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
						].map((item) => (
							<Card
								key={item.title}
								className="border border-(--line) bg-white/72 py-0 shadow-none"
							>
								<CardContent className="flex items-start gap-4 px-5 py-5">
									<span className="inline-flex size-11 items-center justify-center rounded-2xl border border-(--chip-line) bg-(--chip-bg) text-(--lagoon-deep)">
										<item.icon className="size-5" />
									</span>
									<div className="space-y-1">
										<p className="m-0 text-sm font-semibold text-(--sea-ink)">
											{item.title}
										</p>
										<p className="m-0 text-sm leading-6 text-(--sea-ink-soft)">
											{item.detail}
										</p>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</Section>

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
							className="rounded-2xl border border-(--line) bg-white/68 px-4 py-4 text-sm leading-6 text-(--sea-ink-soft)"
						>
							{item}
						</div>
					))}
				</div>
			</Section>

			<section className="rise-in py-10">
				<Card className="feature-card overflow-hidden rounded-[2rem] border border-(--line) bg-(--sea-ink) py-0 text-white shadow-none">
					<CardContent className="grid gap-6 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-center">
						<div className="space-y-3">
							<p className="island-kicker m-0 text-white/60">
								Ready to ship recurring billing
							</p>
							<h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
								Stop rebuilding subscriptions.
							</h2>
							<p className="m-0 max-w-2xl text-base leading-7 text-white/75">
								Start with hosted plans, visible retries, and a portal your
								customers can actually trust.
							</p>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
							<Button
								asChild
								size="lg"
								className="border border-white/10 bg-white text-(--sea-ink) hover:bg-white/90"
							>
								<a href="/auth/signup">Get started</a>
							</Button>
							<Button
								asChild
								size="lg"
								variant="outline"
								className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
							>
								<a href="/auth/login">Sign in</a>
							</Button>
						</div>
					</CardContent>
				</Card>
			</section>

			<Separator className="my-2 bg-(--line)" />
		</main>
	)
}
