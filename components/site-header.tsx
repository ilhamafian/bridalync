"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBell, IconSearch } from "@tabler/icons-react";

import { useUnreadNotificationCount } from "@/components/dashboard/UnreadNotifications";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { getDashboardSection, NAVBAR_SECTIONS } from "@/utils/dashboardShell";

function GlassIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} scroll={false} prefetch className="pointer-events-auto">
      <LiquidGlass
        radius={999}
        tint={0.2}
        bevelDepth={10}
        scale={28}
        aberration={2}
        className="flex size-10 items-center justify-center text-rose-900 shadow-sm ring-1 ring-white/60 dark:text-rose-400 dark:ring-white/15"
        style={{ backgroundColor: "var(--liquid-glass-fill)" }}
      >
        {children}
        <span className="sr-only">{label}</span>
      </LiquidGlass>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const unreadCount = useUnreadNotificationCount();
  const section = getDashboardSection(pathname);

  if (!NAVBAR_SECTIONS.includes(section)) {
    return null;
  }

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-end gap-2 px-4 md:hidden">
      {section === "home" ? (
        <GlassIconLink href="/dashboard/bookings" label="Find bookings">
          <IconSearch className="size-5" aria-hidden />
        </GlassIconLink>
      ) : null}
      <Link
        href="/dashboard/notifications"
        scroll={false}
        prefetch
        className="pointer-events-auto relative"
      >
        <LiquidGlass
          radius={999}
          tint={0.2}
          bevelDepth={10}
          scale={28}
          aberration={2}
          className="flex size-10 items-center justify-center text-rose-900 shadow-sm ring-1 ring-white/60 dark:text-rose-400 dark:ring-white/15"
          style={{ backgroundColor: "var(--liquid-glass-fill)" }}
        >
          <IconBell className="size-5" aria-hidden />
          <span className="sr-only">
            {unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"}
          </span>
        </LiquidGlass>
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-semibold text-primary-foreground tabular-nums shadow-sm ring-2 ring-white/70 dark:ring-zinc-900/60"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>
    </header>
  );
}
