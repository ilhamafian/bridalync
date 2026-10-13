"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconBell,
  IconCheck,
  IconExternalLink,
  IconLink,
  IconPlus,
  IconSearch,
  type Icon,
} from "@tabler/icons-react";

import {
  ADD_LINK_ACTIONS,
  PRIMARY_NAV_ITEMS,
  PROFILE_NAV_HREF,
  SECONDARY_NAV_ITEMS,
  type NavLinkItem,
} from "@/components/dashboard/navItems";
import { onProfilePhotoChange } from "@/components/dashboard/profilePhotoEvents";
import { useUnreadNotificationCount } from "@/components/dashboard/UnreadNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { copyLinkLabel, useCopyProfileLink } from "@/hooks/use-copy-profile-link";
import { cn } from "@/lib/utils";

const itemClassName =
  "flex h-11 w-11 shrink-0 items-center justify-center gap-3 rounded-full text-sm font-medium transition-colors xl:w-full xl:justify-start xl:rounded-xl xl:px-3";
const idleItemClassName =
  "text-muted-foreground hover:bg-white/40 hover:text-foreground dark:hover:bg-white/10";
const activeItemClassName =
  "bg-white/60 text-rose-900 shadow-sm dark:bg-white/15 dark:text-rose-400";

/** Labels only show on the expanded (xl) sidebar; the rail uses tooltips. */
function RailTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="xl:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function ItemLabel({ children }: { children: React.ReactNode }) {
  return <span className="hidden truncate xl:inline">{children}</span>;
}

function SidebarLink({
  title,
  href,
  icon: Icon,
  active = false,
  badge,
  photoUrl,
  external = false,
}: {
  title: string;
  href: string;
  icon: Icon;
  active?: boolean;
  badge?: number;
  photoUrl?: string;
  external?: boolean;
}) {
  const content = (
    <>
      <span className="relative flex size-6 shrink-0 items-center justify-center">
        {photoUrl ? (
          <span
            className={cn(
              "relative size-6 overflow-hidden rounded-full ring-1 ring-white/60 dark:ring-white/15",
              active && "ring-2 ring-primary dark:ring-primary"
            )}
          >
            <Image
              src={photoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="24px"
            />
          </span>
        ) : (
          <Icon
            className={cn("size-5", active && "stroke-[2.25]")}
            aria-hidden
          />
        )}
        {badge ? (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums ring-2 ring-white/70 xl:hidden dark:ring-zinc-900/60"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <ItemLabel>{title}</ItemLabel>
      {badge ? (
        <span className="ml-auto hidden h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] leading-none font-semibold text-primary-foreground tabular-nums xl:flex">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </>
  );

  const className = cn(
    itemClassName,
    active ? activeItemClassName : idleItemClassName
  );
  const srLabel = badge ? `${title}, ${badge} unread` : title;

  return (
    <RailTooltip label={title}>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={srLabel}
          className={className}
        >
          {content}
        </a>
      ) : (
        <Link
          href={href}
          scroll={false}
          prefetch
          aria-label={srLabel}
          aria-current={active ? "page" : undefined}
          className={className}
        >
          {content}
        </Link>
      )}
    </RailTooltip>
  );
}

function NavItemLink({
  item,
  pathname,
  photoUrl,
}: {
  item: NavLinkItem;
  pathname: string;
  photoUrl?: string;
}) {
  return (
    <SidebarLink
      title={item.title}
      href={item.href}
      icon={item.icon}
      active={item.match(pathname)}
      photoUrl={photoUrl}
    />
  );
}

function AddMenu({ profileUrl }: { profileUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const { state: copyState, copy, reset } = useCopyProfileLink(profileUrl, () =>
    setOpen(false)
  );

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        reset();
      }}
    >
      <RailTooltip label="Add">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              itemClassName,
              "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            )}
          >
            <IconPlus className="size-5 shrink-0" aria-hidden />
            <ItemLabel>Add</ItemLabel>
          </button>
        </DropdownMenuTrigger>
      </RailTooltip>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-56 rounded-xl border-white/60 bg-white/85 p-1.5 backdrop-blur-xl dark:bg-zinc-950/80"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Add
        </DropdownMenuLabel>
        {ADD_LINK_ACTIONS.map((action) => {
          const ActionIcon = action.icon;
          return (
            <DropdownMenuItem
              key={action.href}
              asChild
              className="gap-3 rounded-lg px-2.5 py-2 text-sm"
            >
              <Link href={action.href} scroll={false} prefetch>
                <ActionIcon
                  className="size-4! text-muted-foreground"
                  aria-hidden
                />
                {action.title}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!profileUrl}
          className="gap-3 rounded-lg px-2.5 py-2 text-sm"
          onSelect={(event) => {
            event.preventDefault();
            void copy();
          }}
        >
          {copyState === "copied" ? (
            <IconCheck className="size-4! text-primary" aria-hidden />
          ) : (
            <IconLink className="size-4! text-muted-foreground" aria-hidden />
          )}
          {copyLinkLabel(copyState)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CopyLinkButton({ profileUrl }: { profileUrl: string | null }) {
  const { state, copy } = useCopyProfileLink(profileUrl);
  const label = copyLinkLabel(state);

  return (
    <RailTooltip label={label}>
      <button
        type="button"
        onClick={copy}
        disabled={!profileUrl}
        aria-label={label}
        className={cn(
          itemClassName,
          idleItemClassName,
          "disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center">
          {state === "copied" ? (
            <IconCheck className="size-5 text-primary" aria-hidden />
          ) : (
            <IconLink className="size-5" aria-hidden />
          )}
        </span>
        <ItemLabel>{label}</ItemLabel>
      </button>
    </RailTooltip>
  );
}

export function DashboardSidebar({
  profileUrl,
  profilePreviewUrl,
  profilePhotoUrl,
}: {
  profileUrl: string | null;
  profilePreviewUrl: string | null;
  profilePhotoUrl: string | null;
}) {
  const pathname = usePathname();
  const unreadCount = useUnreadNotificationCount();
  const [photoUrl, setPhotoUrl] = useState(profilePhotoUrl ?? "");

  useEffect(() => onProfilePhotoChange(setPhotoUrl), []);

  return (
    <aside
      aria-label="Main navigation"
      className="relative z-20 hidden h-full w-20 shrink-0 flex-col items-center gap-6 border-r border-white/50 bg-white/25 px-3 py-5 backdrop-blur-md md:flex xl:w-64 xl:items-stretch xl:px-4 dark:border-white/10 dark:bg-white/5"
    >
      <Link
        href="/dashboard"
        scroll={false}
        aria-label="Bridalync home"
        className="flex h-10 items-center justify-center font-serif text-2xl font-semibold tracking-tight text-rose-900 xl:justify-start xl:px-3 dark:text-rose-400"
      >
        <span className="xl:hidden">B</span>
        <span className="hidden xl:inline">Bridalync</span>
      </Link>

      <nav className="flex flex-col items-center gap-1 xl:items-stretch">
        {[...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS].map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            pathname={pathname}
            photoUrl={item.href === PROFILE_NAV_HREF ? photoUrl : undefined}
          />
        ))}
      </nav>

      <div className="flex flex-col items-center gap-1 xl:items-stretch">
        <AddMenu profileUrl={profileUrl} />
        <SidebarLink
          title="Find bookings"
          href="/dashboard/bookings"
          icon={IconSearch}
          active={pathname === "/dashboard/bookings"}
        />
        <SidebarLink
          title="Notifications"
          href="/dashboard/notifications"
          icon={IconBell}
          active={pathname.startsWith("/dashboard/notifications")}
          badge={unreadCount}
        />
      </div>

      <div className="mt-auto flex flex-col items-center gap-1 xl:items-stretch">
        {profilePreviewUrl ? (
          <SidebarLink
            title="Preview profile"
            href={profilePreviewUrl}
            icon={IconExternalLink}
            external
          />
        ) : null}
        <CopyLinkButton profileUrl={profileUrl} />
      </div>
    </aside>
  );
}
