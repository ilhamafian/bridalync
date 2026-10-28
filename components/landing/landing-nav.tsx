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

const navItems = [
  { name: "Home", link: "#top" },
  { name: "Solution", link: "#solution" },
  { name: "FAQ", link: "#faq" },
  { name: "About Us", link: "#about" },
];

const waitlistClassName =
  "rounded-full bg-primary px-5 text-primary-foreground shadow-none hover:bg-primary/90";

const overSatinClassName =
  "text-white hover:text-white group-data-[state=scrolled]/nav:text-zinc-100 group-data-[state=scrolled]/nav:hover:text-white";

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
          <NavbarButton href="#waitlist" className={waitlistClassName}>
            Waitlist
          </NavbarButton>
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
            <NavbarButton
              href="#waitlist"
              className={`w-full ${waitlistClassName}`}
              onClick={closeMobileMenu}
            >
              Waitlist
            </NavbarButton>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
