"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { AddActionSheet } from "@/components/dashboard/AddActionSheet";
import {
  PRIMARY_NAV_ITEMS as leftItems,
  PROFILE_NAV_HREF,
  SECONDARY_NAV_ITEMS as rightItems,
  type NavLinkItem,
} from "@/components/dashboard/navItems";
import { onProfilePhotoChange } from "@/components/dashboard/profilePhotoEvents";
import { cn } from "@/lib/utils";

function NavLink({
  item,
  pathname,
  photoUrl,
}: {
  item: NavLinkItem;
  pathname: string;
  photoUrl?: string;
}) {
  const isActive = item.match(pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      scroll={false}
      prefetch
      className={cn(
        "flex size-11 items-center justify-center rounded-full transition-colors",
        isActive
          ? "bg-white/60 text-primary shadow-sm dark:bg-white/15"
          : "text-muted-foreground hover:bg-white/40 hover:text-foreground dark:hover:bg-white/10"
      )}
    >
      {photoUrl ? (
        <span
          className={cn(
            "relative size-7 overflow-hidden rounded-full ring-1 ring-white/60 dark:ring-white/15",
            isActive && "ring-2 ring-primary dark:ring-primary"
          )}
        >
          <Image
            src={photoUrl}
            alt=""
            fill
            className="object-cover"
            sizes="28px"
          />
        </span>
      ) : (
        <Icon
          className={cn("size-5", isActive && "stroke-[2.25]")}
          aria-hidden
        />
      )}
      <span className="sr-only">{item.title}</span>
    </Link>
  );
}

export function BottomNav({
  profileUrl,
  profilePhotoUrl,
}: {
  profileUrl: string | null;
  profilePhotoUrl: string | null;
}) {
  const pathname = usePathname();
  const [photoUrl, setPhotoUrl] = useState(profilePhotoUrl ?? "");

  useEffect(() => onProfilePhotoChange(setPhotoUrl), []);

  return (
    <nav
      aria-label="Main navigation"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="pointer-events-auto flex h-14 w-full items-center justify-around rounded-full bg-white/20 px-4 shadow-md ring-1 ring-white/50 backdrop-blur-md dark:bg-white/5 dark:ring-white/15">
        {leftItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <AddActionSheet profileUrl={profileUrl}>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/40 hover:text-foreground dark:hover:bg-white/10"
          >
            <IconPlus className="size-5" aria-hidden />
            <span className="sr-only">Add</span>
          </button>
        </AddActionSheet>

        {rightItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            photoUrl={item.href === PROFILE_NAV_HREF ? photoUrl : undefined}
          />
        ))}
      </div>
    </nav>
  );
}
