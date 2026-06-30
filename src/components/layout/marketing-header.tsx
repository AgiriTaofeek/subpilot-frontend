import { useEffect, useState } from "react"

import { ListIcon } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"

import ThemeToggle from "#/components/ThemeToggle.tsx"
import { Button } from "#/components/ui/button.tsx"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "#/components/ui/navigation-menu.tsx"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#/components/ui/sheet.tsx"

const marketingLinks = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Webhooks", href: "#webhooks" },
  { label: "Portal", href: "#portal" },
  { label: "Built for Nomba", href: "#proof" },
] as const

function Wordmark() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-3 text-(--sea-ink) no-underline"
    >
      <span className="inline-flex size-10 items-center justify-center rounded-full border border-(--chip-line) bg-(--chip-bg) shadow-[0_8px_22px_rgba(30,90,72,0.08)]">
        <span className="size-3 rounded-full bg-(--lagoon)" />
      </span>
      <span className="flex flex-col">
        <span className="text-lg font-semibold tracking-tight">SubPilot</span>
        <span className="island-kicker text-[0.62rem]">Recurring billing on Nomba</span>
      </span>
    </Link>
  )
}

function HeaderCtas() {
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
        <a href="/auth/login">Sign in</a>
      </Button>
      <Button
        asChild
        size="sm"
        className="hidden border border-transparent bg-(--sea-ink) text-white hover:bg-[color-mix(in_oklab,var(--sea-ink),black_8%)] md:inline-flex"
      >
        <a href="/auth/signup">Get started</a>
      </Button>
      <ThemeToggle />
    </div>
  )
}

export default function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={[
        "sticky top-0 z-50 px-4 transition-all duration-200",
        scrolled
          ? "border-b border-(--line) bg-(--header-bg) backdrop-blur-xl"
          : "bg-transparent",
      ].join(" ")}
    >
      <nav className="page-wrap flex items-center gap-4 py-3 sm:py-4">
        <Wordmark />

        <div className="ml-auto hidden items-center gap-4 lg:flex">
          <NavigationMenu viewport={false}>
            <NavigationMenuList className="gap-1">
              {marketingLinks.map((link) => (
                <NavigationMenuItem key={link.label}>
                  <NavigationMenuLink
                    href={link.href}
                    className="rounded-full px-3 py-2 text-sm text-(--sea-ink-soft) hover:bg-white/60 hover:text-(--sea-ink)"
                  >
                    {link.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          <HeaderCtas />
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Open navigation menu">
                <ListIcon className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-88 border-(--line) bg-(--surface-strong)"
            >
              <SheetHeader className="pb-4">
                <SheetTitle className="font-sans text-xl normal-case tracking-tight text-(--sea-ink)">
                  SubPilot
                </SheetTitle>
                <SheetDescription>
                  Publish plans, recover failed payments, and keep customers in self-serve flows.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-2 px-8 pb-8">
                {marketingLinks.map((link) => (
                  <SheetClose key={link.label} asChild>
                    <a
                      href={link.href}
                      className="rounded-2xl border border-(--line) bg-white/60 px-4 py-3 text-sm font-medium text-(--sea-ink) no-underline"
                    >
                      {link.label}
                    </a>
                  </SheetClose>
                ))}
                <div className="mt-4 grid gap-2">
                  <SheetClose asChild>
                    <Button
                      asChild
                      variant="outline"
                      className="justify-center border-(--line) bg-white/70"
                    >
                      <a href="/auth/login">Sign in</a>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button
                      asChild
                      className="justify-center border border-transparent bg-(--sea-ink) text-white hover:bg-[color-mix(in_oklab,var(--sea-ink),black_8%)]"
                    >
                      <a href="/auth/signup">Get started</a>
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
