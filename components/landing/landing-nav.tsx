"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LandingLogo } from "@/components/landing/landing-logo";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  Navbar,
  NavbarButton,
  NavBody,
  NavItems,
} from "@/components/ui/resizable-navbar";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Home", link: "#top" },
  { name: "Solution", link: "#solution" },
  { name: "FAQ", link: "#faq" },
  { name: "About Us", link: "#about" },
];

const GLASS_SHADOW =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";

const waitlistGlassClassName = cn(
  GLASS_SHADOW,
  "text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100"
);

const waitlistGlassContentClassName =
  "flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]";

const overSatinClassName =
  "text-white hover:text-white group-data-[state=scrolled]/nav:text-zinc-100 group-data-[state=scrolled]/nav:hover:text-white";

function WaitlistGlassButton({
  className,
  contentClassName,
  onClick,
}: {
  className?: string;
  contentClassName?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href="#waitlist"
      onClick={onClick}
      className={cn("inline-flex rounded-full", className)}
    >
      <LiquidGlass
        tint={0.2}
        className={cn(waitlistGlassClassName, "w-full")}
        contentClassName={cn(waitlistGlassContentClassName, contentClassName)}
      >
        Waitlist
      </LiquidGlass>
    </a>
  );
}

/** Same near-black as the scrolled bar (`neutral-950` at 80%). */
const scrolledTint = "rgb(10 10 10 / 0.8)";

function navSurface(visible: boolean) {
  if (!visible) return null;
  return (
    <LiquidGlass
      aria-hidden
      className="pointer-events-none absolute inset-0"
      radius={999}
      tint={0}
      style={{ backgroundColor: scrolledTint }}
    />
  );
}

export function LandingNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    return () => {
      root.classList.remove("dark");
      root.style.colorScheme = "";
    };
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <Navbar className="top-0">
      <NavBody surface={navSurface}>
        <div className="relative z-20">
          <LandingLogo className="brightness-0 invert" />
        </div>
        <NavItems items={navItems} className={overSatinClassName} />
        <div className="relative z-20 flex items-center gap-2">
          <NavbarButton
            as={Link}
            href="/auth"
            variant="secondary"
            className={overSatinClassName}
          >
            Login
          </NavbarButton>
          <WaitlistGlassButton />
        </div>
      </NavBody>

      <MobileNav surface={navSurface}>
        <MobileNavHeader>
          <div className="relative z-20">
            <LandingLogo className="brightness-0 invert" />
          </div>
          <MobileNavToggle
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className={overSatinClassName}
          />
        </MobileNavHeader>
        <MobileNavMenu isOpen={isMobileMenuOpen} onClose={closeMobileMenu}>
          {navItems.map((item) => (
            <a
              key={item.link}
              href={item.link}
              onClick={closeMobileMenu}
              className="block w-full text-sm text-zinc-200"
            >
              {item.name}
            </a>
          ))}
          <div className="flex w-full flex-col gap-2">
            <NavbarButton
              as={Link}
              href="/auth"
              variant="secondary"
              className="w-full"
              onClick={closeMobileMenu}
            >
              Login
            </NavbarButton>
            <WaitlistGlassButton
              className="w-full"
              contentClassName="w-full py-3"
              onClick={closeMobileMenu}
            />
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
