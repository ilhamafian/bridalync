"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { IconCheck, IconLink } from "@tabler/icons-react";

import { ADD_LINK_ACTIONS } from "@/components/dashboard/navItems";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { copyLinkLabel, useCopyProfileLink } from "@/hooks/use-copy-profile-link";

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
  const close = useCallback(() => setOpen(false), []);
  const { state: copyState, copy, reset } = useCopyProfileLink(
    profileUrl,
    close
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    reset();
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
          {ADD_LINK_ACTIONS.map((action) => {
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
            onClick={copy}
            disabled={!profileUrl}
            className={actionClassName}
          >
            {copyState === "copied" ? (
              <IconCheck className="size-5 text-primary" aria-hidden />
            ) : (
              <IconLink className="size-5 text-muted-foreground" aria-hidden />
            )}
            {copyLinkLabel(copyState)}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
