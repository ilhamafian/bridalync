"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconBan,
  IconCalendarPlus,
  IconCalendarStats,
  IconCheck,
  IconFlame,
  IconLink,
  type Icon,
} from "@tabler/icons-react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const linkActions: { title: string; href: string; icon: Icon }[] = [
  { title: "Booking", href: "/dashboard/bookings/new", icon: IconCalendarPlus },
  { title: "Block", href: "/dashboard/blocked", icon: IconBan },
  { title: "Hot dates", href: "/dashboard/hot-dates", icon: IconFlame },
  {
    title: "Booking period",
    href: "/dashboard/booking-period",
    icon: IconCalendarStats,
  },
];

const actionClassName =
  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-white/50 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-white/10";

export function AddActionSheet({
  profileUrl,
  children,
}: {
  profileUrl: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setCopyState("idle");
    }
  }

  async function handleCopyLink() {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopyState("copied");
      closeTimer.current = setTimeout(() => handleOpenChange(false), 900);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        contained
        overlayClassName="bg-black/10 supports-backdrop-filter:backdrop-blur-[2px]"
        className="rounded-t-2xl border-white/60 bg-white/80 backdrop-blur-xl dark:border-white/15 dark:bg-zinc-950/75"
      >
        <SheetHeader className="pb-2">
          <SheetTitle>Add</SheetTitle>
          <SheetDescription className="sr-only">
            Create a booking, manage availability, or share your profile link.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {linkActions.map((action) => {
            const Icon = action.icon;
            return (
              <SheetClose key={action.href} asChild>
                <Link
                  href={action.href}
                  scroll={false}
                  prefetch
                  className={actionClassName}
                >
                  <Icon className="size-5 text-muted-foreground" aria-hidden />
                  {action.title}
                </Link>
              </SheetClose>
            );
          })}
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!profileUrl}
            className={actionClassName}
          >
            {copyState === "copied" ? (
              <IconCheck className="size-5 text-primary" aria-hidden />
            ) : (
              <IconLink className="size-5 text-muted-foreground" aria-hidden />
            )}
            {copyState === "copied"
              ? "Link copied"
              : copyState === "error"
                ? "Could not copy link"
                : "Copy link"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
