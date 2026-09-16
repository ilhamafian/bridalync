"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconExternalLink, IconUser } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader({
  profilePreviewUrl,
  profileName,
  profilePhotoUrl,
}: {
  profilePreviewUrl?: string | null;
  profileName?: string | null;
  profilePhotoUrl?: string | null;
}) {
  const pathname = usePathname();
  const isProfileActive = pathname.startsWith("/dashboard/profile");
  const displayName = profileName?.trim() || "Profile";
  const photoUrl = profilePhotoUrl?.trim() || "";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
      <Link
        href="/dashboard/profile"
        scroll={false}
        prefetch
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-full py-1 pr-2 transition-colors",
          isProfileActive
            ? "bg-primary/10 text-primary"
            : "text-foreground hover:bg-muted"
        )}
      >
        <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="32px"
            />
          ) : initials ? (
            <span aria-hidden>{initials}</span>
          ) : (
            <IconUser className="size-4" aria-hidden />
          )}
        </span>
        <span className="truncate text-sm font-medium">{displayName}</span>
        <span className="sr-only">Profile</span>
      </Link>
      {profilePreviewUrl ? (
        <Button asChild variant="outline" size="sm" className="md:hidden">
          <a href={profilePreviewUrl} target="_blank" rel="noreferrer">
            Profile preview
            <IconExternalLink data-icon="inline-end" />
          </a>
        </Button>
      ) : null}
    </header>
  );
}
