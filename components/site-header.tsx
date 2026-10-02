"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBell } from "@tabler/icons-react";

import { getDashboardSection, NAVBAR_SECTIONS } from "@/utils/dashboardShell";

export function SiteHeader() {
  const pathname = usePathname();

  if (!NAVBAR_SECTIONS.includes(getDashboardSection(pathname))) {
    return null;
  }

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-3 px-4">
      <div />
      <Link
        href="/dashboard/notifications"
        scroll={false}
        prefetch
        className="flex size-10 items-center justify-center rounded-full border border-zinc-900/10 bg-white/40 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-white/55 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15"
      >
        <IconBell className="size-5" aria-hidden />
        <span className="sr-only">Notifications</span>
      </Link>
    </header>
  );
}
