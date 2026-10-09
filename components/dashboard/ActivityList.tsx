import Link from "next/link";
import {
  IconCalendarPlus,
  IconCalendarQuestion,
  IconCalendarX,
  IconCash,
  IconCashBanknote,
  IconChecks,
  IconCircleCheck,
  type Icon,
} from "@tabler/icons-react";

import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityItem, ActivityKind } from "@/utils/activity";
import { formatRm } from "@/utils/booking/pricing";
import { bookingStatusLabel } from "@/utils/dashboard";

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TIME_AGO_UNITS: { unit: string; ms: number }[] = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "min", ms: 60 * 1000 },
];

/** "Just now", "6 mins ago", "1 hour ago", ... */
export function formatTimeAgo(value: string, now: number) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const elapsed = Math.max(0, now - time);
  for (const { unit, ms } of TIME_AGO_UNITS) {
    const count = Math.floor(elapsed / ms);
    if (count >= 1) return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
  }
  return "Just now";
}

const activityIcons: Record<ActivityKind, Icon> = {
  request: IconCalendarQuestion,
  new: IconCalendarPlus,
  deposit: IconCash,
  balance: IconCashBanknote,
  full: IconChecks,
  completed: IconCircleCheck,
  cancelled: IconCalendarX,
};

function activityBadgeVariant(
  status: ActivityItem["bookingStatus"]
): "default" | "success" | "outline" | "destructive" {
  switch (status) {
    case "confirmed":
      return "default";
    case "completed":
      return "success";
    case "cancelled":
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function ActivityRow({
  item,
  unread,
  onOpen,
  now,
}: {
  item: ActivityItem;
  unread: boolean;
  onOpen?: (item: ActivityItem) => void;
  now?: number;
}) {
  const Icon = activityIcons[item.kind];
  const isCancelled = item.kind === "cancelled";
  const showBalance = item.kind === "deposit" && item.balanceRm > 0;

  return (
    <li>
      <Link
        href={`/dashboard/bookings/${encodeURIComponent(item.bookingId)}`}
        scroll={false}
        onClick={() => onOpen?.(item)}
        className={cn(
          "relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none dark:hover:bg-white/5 dark:focus-visible:bg-white/5",
          unread && "bg-white/25 dark:bg-white/5"
        )}
      >
        {unread ? (
          <span
            aria-hidden
            className="absolute top-1/2 left-1.5 size-1.5 -translate-y-1/2 rounded-full bg-primary"
          />
        ) : null}
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full bg-white/50 dark:bg-white/10",
            isCancelled ? "text-muted-foreground" : "text-primary"
          )}
        >
          <Icon className="size-4.5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p
            className={cn(
              "truncate text-sm",
              unread ? "font-semibold" : "font-medium"
            )}
          >
            {item.label}
            {unread ? <span className="sr-only"> (unread)</span> : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {item.clientName} · {item.packageName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatActivityTime(item.at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              isCancelled && "text-muted-foreground line-through"
            )}
          >
            {formatRm(item.amountRm)}
          </p>
          <Badge variant={activityBadgeVariant(item.bookingStatus)}>
            {bookingStatusLabel(item.bookingStatus)}
          </Badge>
          {showBalance ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatRm(item.balanceRm)} due
            </p>
          ) : null}
          {now !== undefined ? (
            <p className="text-xs text-muted-foreground">
              {formatTimeAgo(item.at, now)}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export function ActivityList({
  items,
  isUnread,
  onOpen,
  now,
}: {
  items: ActivityItem[];
  isUnread?: (item: ActivityItem) => boolean;
  onOpen?: (item: ActivityItem) => void;
  /** Current time (ms); when set, each row shows a relative "6 mins ago" timestamp. */
  now?: number;
}) {
  return (
    <div className={cn(glassCardClassName, "overflow-hidden")}>
      <ul className="divide-y divide-white/50 dark:divide-white/10">
        {items.map((item) => (
          <ActivityRow
            key={item.id}
            item={item}
            unread={isUnread?.(item) ?? false}
            onOpen={onOpen}
            now={now}
          />
        ))}
      </ul>
    </div>
  );
}
