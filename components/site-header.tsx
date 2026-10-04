"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBell } from "@tabler/icons-react";

import { useUnreadNotificationCount } from "@/components/dashboard/UnreadNotifications";
import { getDashboardSection, NAVBAR_SECTIONS } from "@/utils/dashboardShell";

export function SiteHeader() {
  const pathname = usePathname();
  const unreadCount = useUnreadNotificationCount();

  if (!NAVBAR_SECTIONS.includes(getDashboardSection(pathname))) {
    return null;
  }

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-end px-4">
      <Link
        href="/dashboard/notifications"
        scroll={false}
        prefetch
        className="pointer-events-auto relative flex size-10 items-center justify-center rounded-full border border-zinc-900/10 bg-white/40 text-rose-900 shadow-sm backdrop-blur-sm transition-colors hover:bg-white/55 dark:border-white/20 dark:bg-white/10 dark:text-rose-400 dark:hover:bg-white/15"
      >
        <IconBell className="size-5" aria-hidden />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-semibold text-primary-foreground tabular-nums shadow-sm ring-2 ring-white/70 dark:ring-zinc-900/60"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
        <span className="sr-only">
          {unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"}
        </span>
      </Link>
    </header>
  );
}
