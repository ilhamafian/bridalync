import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { LandingLogo } from "./landing-logo";

const navLinks = [
  { href: "#solutions", label: "Solutions" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-landing-ink/5 bg-landing-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between px-6 lg:h-20 lg:px-8">
        <LandingLogo className="[&_img]:h-10 sm:[&_img]:h-11" />

        <nav className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-serif text-lg text-landing-ink/70 transition-colors hover:text-landing-ink"
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
              "hidden h-10 rounded-full px-5 font-serif text-lg text-landing-ink sm:inline-flex",
              "hover:bg-landing-ink/5"
            )}
          >
            <Link href="/auth">Login</Link>
          </Button>
          <Button
            asChild
            className="h-10 rounded-full bg-landing-rose px-6 font-serif text-lg text-landing-cream-text hover:bg-landing-rose/90"
          >
            <Link href="/auth?tab=signup">Waitlist</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
