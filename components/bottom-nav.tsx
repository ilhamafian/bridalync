"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBoxMultiple,
  IconCalendar,
  IconHome,
  IconSettings,
  type Icon,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

const navItems: {
  title: string;
  href: string;
  icon: Icon;
  match?: (pathname: string) => boolean;
}[] = [
  {
    title: "Home",
    href: "/dashboard",
    icon: IconHome,
    match: (pathname) => pathname === "/dashboard",
  },
  {
    title: "Bookings",
    href: "/dashboard/bookings",
    icon: IconCalendar,
    match: (pathname) => pathname.startsWith("/dashboard/bookings"),
  },
  {
    title: "Packages",
    href: "/dashboard/packages",
    icon: IconBoxMultiple,
    match: (pathname) => pathname.startsWith("/dashboard/packages"),
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: IconSettings,
    match: (pathname) => pathname.startsWith("/dashboard/settings"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex w-full items-center justify-around rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80">
        {navItems.map((item) => {
          const isActive = item.match
            ? item.match(pathname)
            : pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex size-11 items-center justify-center rounded-full transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon
                className={cn("size-5", isActive && "stroke-[2.25]")}
                aria-hidden
              />
              <span className="sr-only">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
