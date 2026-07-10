"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBoxMultiple,
  IconCalendar,
  IconHome,
  IconSettings,
  IconUser,
  type Icon,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

const navItems: {
  title: string;
  href: string;
  icon: Icon;
  emphasized?: boolean;
  match?: (pathname: string) => boolean;
}[] = [
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
    title: "Home",
    href: "/dashboard",
    icon: IconHome,
    emphasized: true,
    match: (pathname) => pathname === "/dashboard",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: IconSettings,
    match: (pathname) => pathname.startsWith("/dashboard/settings"),
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: IconUser,
    match: (pathname) => pathname.startsWith("/dashboard/profile"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="relative flex h-14 w-full items-center justify-around overflow-visible rounded-full border bg-background/95 px-4 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80">
        {navItems.map((item) => {
          const isActive = item.match
            ? item.match(pathname)
            : pathname === item.href;
          const Icon = item.icon;
          const isEmphasized = Boolean(item.emphasized);

          if (isEmphasized) {
            return (
              <div
                key={item.href}
                className="relative flex size-11 shrink-0 items-center justify-center"
              >
                <Link
                  href={item.href}
                  className={cn(
                    "absolute z-10 flex size-16 items-center justify-center rounded-full shadow-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <Icon className="size-7 stroke-[2]" aria-hidden />
                  <span className="sr-only">{item.title}</span>
                </Link>
              </div>
            );
          }

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
