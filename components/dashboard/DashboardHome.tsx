import Link from "next/link";

import { BookingCarousel } from "@/components/dashboard/BookingCarousel";
import {
  formatScheduleDate,
  glassCardClassName,
} from "@/components/dashboard/HomeBookingCard";
import { cn } from "@/lib/utils";
import type { ActivityItem, ScheduleItem } from "@/utils/dashboard";

export type DashboardHomeProps = {
  greeting: string;
  firstName: string;
  upcomingThisWeek: number;
  todaysSchedule: ScheduleItem[];
  upcoming: ScheduleItem[];
  completed: ScheduleItem[];
  activity: ActivityItem[];
};

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

function SeeMoreLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      className="block px-4 py-3 text-center text-sm font-medium text-primary hover:underline"
    >
      See more
    </Link>
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
    <div className="flex flex-col gap-6 px-4 lg:px-6">
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
          <div className={cn(glassCardClassName, "overflow-hidden")}>
            <ul className="divide-y divide-white/50 dark:divide-white/10">
              {completed.map((item) => (
                <li key={`${item.bookingId}-${item.startsAtMs}`}>
                  <Link
                    href="/dashboard/bookings"
                    scroll={false}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/30 dark:hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.clientName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.packageName}
                        {item.sessionName ? ` · ${item.sessionName}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formatScheduleDate(item.date)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-white/50 dark:border-white/10">
              <SeeMoreLink href="/dashboard/bookings?status=completed" />
            </div>
          </div>
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
                <li key={item.id} className="flex flex-col gap-0.5 px-4 py-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatActivityTime(item.at)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
