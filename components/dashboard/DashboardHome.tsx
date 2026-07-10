"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconBoxMultiple,
  IconCalendar,
  IconCalendarPlus,
  IconCheck,
  IconCircle,
  IconLink,
  IconMapPin,
} from "@tabler/icons-react";

import { NavigateButton } from "@/components/dashboard/NavigateButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRm } from "@/utils/booking/pricing";
import {
  scheduleStatusLabel,
  type ActivityItem,
  type ChecklistItem,
  type DashboardStats,
  type OutstandingPayments,
  type ScheduleItem,
  type ScheduleStatus,
} from "@/utils/dashboard";

export type DashboardHomeProps = {
  greeting: string;
  firstName: string;
  upcomingThisWeek: number;
  todaysSchedule: ScheduleItem[];
  nextUpcoming: ScheduleItem | null;
  summary: DashboardStats;
  outstanding: OutstandingPayments;
  activity: ActivityItem[];
  checklist: ChecklistItem[];
  bookingLink: string;
};

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

function formatTimeRange(startTime: string, endTime: string) {
  return `${startTime} – ${endTime}`;
}

function formatScheduleDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
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

function BookingCard({
  item,
  showDate = false,
  clickable = false,
}: {
  item: ScheduleItem;
  showDate?: boolean;
  clickable?: boolean;
}) {
  return (
    <Card className={cn("relative", clickable && "transition-colors hover:bg-muted/30")}>
      {clickable ? (
        <Link
          href="/dashboard/bookings"
          className="absolute inset-0 z-0 rounded-xl"
          aria-label={`View booking for ${item.clientName}`}
        />
      ) : null}
      <CardHeader className="relative z-10 space-y-2 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {showDate ? `${formatScheduleDate(item.date)} · ` : null}
              {formatTimeRange(item.startTime, item.endTime)}
            </p>
            <CardTitle className="truncate text-base">{item.clientName}</CardTitle>
            <CardDescription className="truncate">
              {item.packageName}
              {item.sessionName ? ` · ${item.sessionName}` : ""}
            </CardDescription>
          </div>
          <Badge variant={statusBadgeVariant(item.scheduleStatus)}>
            {scheduleStatusLabel(item.scheduleStatus)}
          </Badge>
        </div>
        {item.location ? (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <IconMapPin className="mt-0.5 size-4 shrink-0" />
            <span className="line-clamp-2">{item.location.formattedAddress}</span>
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="relative z-10 flex flex-col gap-2 pt-0 sm:flex-row">
        <Button asChild variant="outline" size="lg" className="min-h-11 flex-1">
          <Link href="/dashboard/bookings">View Details</Link>
        </Button>
        <NavigateButton
          lat={item.location?.lat ?? 0}
          lng={item.location?.lng ?? 0}
          disabled={!item.location?.navigable}
        />
      </CardContent>
    </Card>
  );
}

export function DashboardHome({
  greeting,
  firstName,
  upcomingThisWeek,
  todaysSchedule,
  nextUpcoming,
  summary,
  outstanding,
  activity,
  checklist,
  bookingLink,
}: DashboardHomeProps) {
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const incompleteChecklist = checklist.filter((item) => !item.done);
  const showChecklist = incompleteChecklist.length > 0;

  async function handleShareLink() {
    setShareMessage(null);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Book with me",
          text: "Book your appointment",
          url: bookingLink,
        });
        return;
      }
      await navigator.clipboard.writeText(bookingLink);
      setShareMessage("Booking link copied.");
    } catch {
      try {
        await navigator.clipboard.writeText(bookingLink);
        setShareMessage("Booking link copied.");
      } catch {
        setShareMessage("Could not share link.");
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {greeting}, {firstName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You have {upcomingThisWeek} upcoming booking
          {upcomingThisWeek === 1 ? "" : "s"} this week.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium">Today&apos;s schedule</h3>
          <p className="text-sm text-muted-foreground">
            Your appointments for today, in order.
          </p>
        </div>
        {todaysSchedule.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nothing scheduled today. Enjoy your free day.
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {todaysSchedule.map((item) => (
              <li key={`${item.bookingId}-${item.startsAtMs}`}>
                <BookingCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium">Next upcoming booking</h3>
          <p className="text-sm text-muted-foreground">
            The next session after today.
          </p>
        </div>
        {nextUpcoming ? (
          <BookingCard item={nextUpcoming} showDate clickable />
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No upcoming bookings after today.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Booking summary</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today", value: summary.today },
            { label: "This week", value: summary.thisWeek },
            { label: "This month", value: summary.thisMonth },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="px-3 py-4 text-center">
                <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outstanding payments</CardTitle>
            <CardDescription>
              Balances still due from confirmed bookings.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="text-2xl font-semibold tabular-nums">
                {formatRm(outstanding.totalRm)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {outstanding.clientCount} client
                {outstanding.clientCount === 1 ? "" : "s"} with pending payments
              </p>
            </div>
            <Button asChild variant="outline" className="w-full sm:w-fit">
              <Link href="/dashboard/bookings">View pending payments</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Quick actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button asChild size="lg" className="h-auto min-h-14 flex-col gap-1 py-3">
            <Link href="/dashboard/bookings">
              <IconCalendarPlus className="size-5" />
              <span>New Booking</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-auto min-h-14 flex-col gap-1 py-3"
          >
            <Link href="/dashboard/bookings">
              <IconCalendar className="size-5" />
              <span>View Bookings</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-auto min-h-14 flex-col gap-1 py-3"
          >
            <Link href="/dashboard/packages">
              <IconBoxMultiple className="size-5" />
              <span>Manage Packages</span>
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-auto min-h-14 flex-col gap-1 py-3"
            onClick={handleShareLink}
            disabled={!bookingLink}
          >
            <IconLink className="size-5" />
            <span>Share Booking Link</span>
          </Button>
        </div>
        {shareMessage ? (
          <p className="text-sm text-muted-foreground">{shareMessage}</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Recent activity</h3>
        <Card>
          <CardContent className="divide-y p-0">
            {activity.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No recent activity yet.
              </p>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="flex flex-col gap-0.5 px-4 py-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatActivityTime(item.at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {showChecklist ? (
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-medium">Setup checklist</h3>
            <p className="text-sm text-muted-foreground">
              Finish these to get the most from Bridalync.
            </p>
          </div>
          <Card>
            <CardContent className="flex flex-col gap-1 p-2">
              {checklist.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
                >
                  {item.done ? (
                    <IconCheck className="size-4 text-primary" />
                  ) : (
                    <IconCircle className="size-4 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      item.done && "text-muted-foreground line-through"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
