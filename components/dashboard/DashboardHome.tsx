"use client";

import Link from "next/link";
import {
  IconBrandWhatsapp,
  IconCalendarPlus,
  IconCalendarX,
  IconCash,
  IconCircleCheck,
  type Icon,
} from "@tabler/icons-react";

import { BookingCarousel } from "@/components/dashboard/BookingCarousel";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRm } from "@/utils/booking/pricing";
import {
  bookingStatusLabel,
  type ActivityItem,
  type ActivityKind,
  type CompletedScheduleItem,
  type ScheduleItem,
} from "@/utils/dashboard";

export type DashboardHomeProps = {
  greeting: string;
  firstName: string;
  upcomingThisWeek: number;
  todaysSchedule: ScheduleItem[];
  upcoming: ScheduleItem[];
  completed: CompletedScheduleItem[];
  activity: ActivityItem[];
};

function LeaveReviewButton({ item }: { item: CompletedScheduleItem }) {
  if (!item.leaveReviewUrl) {
    return (
      <Button
        size="lg"
        className="min-h-11 flex-none gap-2 px-4"
        disabled
        title="This client has no phone number"
      >
        <IconBrandWhatsapp className="size-5" />
        Leave Review
      </Button>
    );
  }

  return (
    <Button asChild size="lg" className="min-h-11 flex-none gap-2 px-4">
      <a href={item.leaveReviewUrl} target="_blank" rel="noopener noreferrer">
        <IconBrandWhatsapp className="size-5" />
        Leave Review
      </a>
    </Button>
  );
}

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

const activityIcons: Record<ActivityKind, Icon> = {
  new: IconCalendarPlus,
  deposit: IconCash,
  paid: IconCash,
  completed: IconCircleCheck,
  cancelled: IconCalendarX,
};

function activityBadgeVariant(
  status: ActivityItem["bookingStatus"]
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "confirmed":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = activityIcons[item.kind];
  const isCancelled = item.kind === "cancelled";
  const showBalance =
    !isCancelled && item.kind !== "completed" && item.balanceRm > 0;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full bg-white/50 dark:bg-white/10",
          isCancelled ? "text-muted-foreground" : "text-primary"
        )}
      >
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium">{item.label}</p>
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
      </div>
    </li>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        glassCardClassName,
        "px-4 py-8 text-center text-sm text-muted-foreground"
      )}
    >
      {children}
    </div>
  );
}

export function DashboardHome({
  greeting,
  firstName,
  upcomingThisWeek,
  todaysSchedule,
  upcoming,
  completed,
  activity,
}: DashboardHomeProps) {
  const showToday = todaysSchedule.length > 0;
  const bookings = showToday ? todaysSchedule : upcoming;

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <section className="pr-12">
        <h2 className="text-xl font-semibold tracking-tight">
          {greeting}, {firstName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You have {upcomingThisWeek} upcoming booking
          {upcomingThisWeek === 1 ? "" : "s"} this week.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">
          {showToday ? "Today's bookings" : "Upcoming bookings"}
        </h3>
        {bookings.length === 0 ? (
          <EmptyCard>No upcoming bookings.</EmptyCard>
        ) : (
          <BookingCarousel
            items={bookings}
            showDate={!showToday}
            seeMoreHref="/dashboard/bookings"
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Completed bookings</h3>
        {completed.length === 0 ? (
          <EmptyCard>No completed bookings yet.</EmptyCard>
        ) : (
          <BookingCarousel
            items={completed}
            showDate
            seeMoreHref="/dashboard/bookings?status=completed"
            renderAction={(item) => <LeaveReviewButton item={item} />}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Recent activity</h3>
        {activity.length === 0 ? (
          <EmptyCard>No recent activity yet.</EmptyCard>
        ) : (
          <div className={glassCardClassName}>
            <ul className="divide-y divide-white/50 dark:divide-white/10">
              {activity.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>
          </div>
        )}
        <Link
          href="/dashboard/notifications"
          scroll={false}
          className="self-end text-sm font-medium text-primary hover:underline"
        >
          See more
        </Link>
      </section>
    </div>
  );
}
