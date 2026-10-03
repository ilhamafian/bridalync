import Link from "next/link";
import { IconMapPin } from "@tabler/icons-react";

import { NavigateButton } from "@/components/dashboard/NavigateButton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatLocationAddress } from "@/utils/session";
import {
  scheduleStatusLabel,
  type ScheduleItem,
  type ScheduleStatus,
} from "@/utils/dashboard";

export const glassCardClassName =
  "rounded-2xl bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm dark:bg-white/10 dark:ring-white/15";

function statusBadgeVariant(
  status: ScheduleStatus
): "default" | "secondary" | "outline" {
  switch (status) {
    case "in_progress":
      return "default";
    case "completed":
      return "secondary";
    default:
      return "outline";
  }
}

export function formatScheduleDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function HomeBookingCard({
  item,
  showDate = false,
  action,
  className,
}: {
  item: ScheduleItem;
  showDate?: boolean;
  /** Bottom-right action; defaults to the Navigate button. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        glassCardClassName,
        "relative flex flex-col gap-4 p-4 transition-colors hover:bg-white/40 dark:hover:bg-white/15",
        className
      )}
    >
      <Link
        href={`/dashboard/bookings/${encodeURIComponent(item.bookingId)}`}
        scroll={false}
        className="absolute inset-0 rounded-2xl"
        aria-label={`View booking for ${item.clientName}`}
      />
      <div className="pointer-events-none relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {showDate ? `${formatScheduleDate(item.date)} · ` : null}
            {item.startTime} – {item.endTime}
          </p>
          <p className="truncate text-base font-semibold">{item.clientName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.packageName}
            {item.sessionName ? ` · ${item.sessionName}` : ""}
          </p>
        </div>
        <Badge variant={statusBadgeVariant(item.scheduleStatus)}>
          {scheduleStatusLabel(item.scheduleStatus)}
        </Badge>
      </div>
      <div className="relative mt-auto flex items-end justify-between gap-3">
        {item.location ? (
          <p className="pointer-events-none flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
            <IconMapPin className="mt-0.5 size-4 shrink-0" />
            <span className="line-clamp-2">
              {formatLocationAddress(item.location)}
            </span>
          </p>
        ) : (
          <span />
        )}
        {action ?? (
          <NavigateButton
            lat={item.location?.lat ?? 0}
            lng={item.location?.lng ?? 0}
            disabled={!item.location?.navigable}
            className="flex-none px-4"
          />
        )}
      </div>
    </div>
  );
}
