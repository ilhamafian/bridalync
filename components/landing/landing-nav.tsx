"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";

import { LandingLogo } from "@/components/landing/landing-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinkClassName =
  "text-sm text-zinc-700 transition-colors hover:text-zinc-900";

const navLabelClassName = "text-sm text-zinc-700";

const placeholderLabels = ["About Us"] as const;

const ctaClassName = "h-10 rounded-full px-5 text-sm";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/30 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
        <LandingLogo />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Page">
          <a href="#top" className={navLinkClassName}>
            Home
          </a>
          <a href="#solution" className={navLinkClassName}>
            Solution
          </a>
          <a href="#faq" className={navLinkClassName}>
            FAQ
          </a>
          {placeholderLabels.map((label) => (
            <span key={label} className={navLabelClassName}>
              {label}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 rounded-full border border-zinc-900/10 bg-white/40 text-rose-900 backdrop-blur-sm hover:bg-white/55 md:hidden"
                aria-label="Open menu"
              >
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 border-white/60 bg-white/80 backdrop-blur-md"
            >
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 px-6 text-base" aria-label="Page">
                <SheetClose asChild>
                  <a href="#top" className={navLinkClassName}>
                    Home
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#solution" className={navLinkClassName}>
                    Solution
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#faq" className={navLinkClassName}>
                    FAQ
                  </a>
                </SheetClose>
                {placeholderLabels.map((label) => (
                  <span key={label} className={navLabelClassName}>
                    {label}
                  </span>
                ))}
                <SheetClose asChild>
                  <Link href="/auth" className={navLinkClassName}>
                    Login
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#waitlist" className={navLinkClassName}>
                    Waitlist
                  </a>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>

          <Button
            asChild
            variant="ghost"
            className={cn(ctaClassName, "px-4 text-zinc-800 hover:bg-white/40")}
          >
            <Link href="/auth">Login</Link>
          </Button>
          <Button asChild className={ctaClassName}>
            <a href="#waitlist">Waitlist</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
