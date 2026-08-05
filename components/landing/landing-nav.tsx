import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { LandingLogo } from "./landing-logo";

const navLinks = [
  { href: "#features", label: "Product" },
  { href: "#pricing", label: "Pricing" },
  { href: "#about", label: "About" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-landing-ink/5 bg-landing-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:h-[4.5rem] lg:px-8">
        <LandingLogo />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base text-landing-ink/70 transition-colors hover:text-landing-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            variant="ghost"
            className={cn(
              "hidden h-9 rounded-full px-4 font-serif text-base text-landing-ink sm:inline-flex",
              "hover:bg-landing-ink/5"
            )}
          >
            <Link href="/auth">Login</Link>
          </Button>
          <Button
            asChild
            className="h-9 rounded-full bg-landing-rose px-5 font-serif text-base text-landing-cream-text hover:bg-landing-rose/90"
          >
            <Link href="/auth?tab=signup">Waitlist</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
