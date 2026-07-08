import { ListIcon } from "@phosphor-icons/react";
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ThemeToggle } from "#/components/layout/theme-toggle.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from "#/components/ui/navigation-menu.tsx";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "#/components/ui/sheet.tsx";

const marketingLinks = [
	{ label: "Product", href: "#product" },
	{ label: "How it works", href: "#how-it-works" },
	{ label: "Webhooks", href: "#webhooks" },
] as const;

function Wordmark() {
	return (
		<Link
			to="/"
			className="inline-flex items-center gap-3 text-(--ink) no-underline"
		>
			<span className="inline-flex size-9 items-center justify-center rounded-full border border-(--brand)/25 bg-(--brand)/10">
				<span className="size-3 rounded-full bg-(--brand)" />
			</span>
			<span className="flex flex-col">
				<span className="text-lg font-semibold tracking-tight">SubPilot</span>
				<span className="island-kicker text-[0.60rem]">
					Recurring billing on Nomba
				</span>
			</span>
		</Link>
	);
}

function HeaderCtas() {
	return (
		<div className="flex items-center gap-2">
			<Button
				asChild
				variant="ghost"
				size="sm"
				className="hidden text-(--ink-2) hover:text-(--ink) md:inline-flex"
			>
				<Link to="/auth/login">Sign in</Link>
			</Button>
			<Button
				asChild
				size="sm"
				className="hidden border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90 md:inline-flex"
			>
				<Link to="/auth/signup">Get started</Link>
			</Button>
			<ThemeToggle />
		</div>
	);
}

export function MarketingHeader() {
	const [scrolled, setScrolled] = useState(false);
	const isHome = useLocation({
		select: (location) => location.pathname === "/",
	});

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 20);
		window.addEventListener("scroll", onScroll, { passive: true });
		onScroll();
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header
			className={[
				"sticky top-0 z-50 px-6 transition-colors duration-200",
				scrolled
					? "border-b border-(--line) bg-(--surface-1)/90 backdrop-blur-xl"
					: "bg-transparent",
			].join(" ")}
		>
			<nav className="page-wrap flex items-center gap-4 py-3 sm:py-4">
				<Wordmark />

				<div className="ml-auto hidden items-center gap-4 lg:flex">
					<NavigationMenu viewport={false}>
						<NavigationMenuList className="gap-1">
							{isHome
								? marketingLinks.map((link) => (
										<NavigationMenuItem key={link.label}>
											<NavigationMenuLink
												href={link.href}
												className="rounded-full px-3 py-2 text-sm text-(--ink-2) hover:bg-(--surface-2) hover:text-(--ink)"
											>
												{link.label}
											</NavigationMenuLink>
										</NavigationMenuItem>
									))
								: null}
							<NavigationMenuItem>
								<NavigationMenuLink
									asChild
									className="rounded-full px-3 py-2 text-sm text-(--ink-2) hover:bg-(--surface-2) hover:text-(--ink)"
								>
									<Link to="/docs">API docs</Link>
								</NavigationMenuLink>
							</NavigationMenuItem>
						</NavigationMenuList>
					</NavigationMenu>
					<HeaderCtas />
				</div>

				<div className="ml-auto flex items-center gap-2 lg:hidden">
					<ThemeToggle />
					<Sheet>
						<SheetTrigger asChild>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label="Open navigation menu"
							>
								<ListIcon />
							</Button>
						</SheetTrigger>
						<SheetContent
							side="right"
							className="w-88 border-(--line) bg-(--surface-1)"
						>
							<SheetHeader className="pb-4">
								<SheetTitle className="font-sans text-xl normal-case tracking-tight text-(--ink)">
									SubPilot
								</SheetTitle>
								<SheetDescription className="text-(--ink-2)">
									Publish plans, recover failed payments, and keep customers in
									self-serve flows.
								</SheetDescription>
							</SheetHeader>
							<div className="flex flex-1 flex-col gap-2 px-8 pb-8">
								{isHome
									? marketingLinks.map((link) => (
											<SheetClose key={link.label} asChild>
												<a
													href={link.href}
													className="rounded-2xl border border-(--line) bg-(--surface-2) px-4 py-3 text-sm font-medium text-(--ink) no-underline"
												>
													{link.label}
												</a>
											</SheetClose>
										))
									: null}
								<SheetClose asChild>
									<Link
										to="/docs"
										className="rounded-2xl border border-(--line) bg-(--surface-2) px-4 py-3 text-sm font-medium text-(--ink) no-underline"
									>
										API docs
									</Link>
								</SheetClose>
								<div className="mt-4 grid gap-2">
									<SheetClose asChild>
										<Button
											asChild
											variant="outline"
											className="justify-center border-(--line)"
										>
											<Link to="/auth/login">Sign in</Link>
										</Button>
									</SheetClose>
									<SheetClose asChild>
										<Button
											asChild
											className="justify-center border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
										>
											<Link to="/auth/signup">Get started</Link>
										</Button>
									</SheetClose>
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</nav>
		</header>
	);
}
