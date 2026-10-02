import Link from "next/link";
import { IconMapPin } from "@tabler/icons-react";

import { NavigateButton } from "@/components/dashboard/NavigateButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  className,
}: {
  item: ScheduleItem;
  showDate?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(glassCardClassName, "flex flex-col gap-4 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
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
      {item.location ? (
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <IconMapPin className="mt-0.5 size-4 shrink-0" />
          <span className="line-clamp-2">
            {formatLocationAddress(item.location)}
          </span>
        </p>
      ) : null}
      <div className="mt-auto flex gap-2">
        <Button
          asChild
          variant="outline"
          size="lg"
          className="min-h-11 flex-1 border-white/60 bg-white/40 hover:bg-white/60 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <Link href="/dashboard/bookings" scroll={false}>
            View details
          </Link>
        </Button>
        <NavigateButton
          lat={item.location?.lat ?? 0}
          lng={item.location?.lng ?? 0}
          disabled={!item.location?.navigable}
        />
      </div>
    </div>
  );
}
