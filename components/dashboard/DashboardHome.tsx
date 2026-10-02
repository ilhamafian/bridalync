"use client";

import { IconBrandWhatsapp } from "@tabler/icons-react";

import { BookingCarousel } from "@/components/dashboard/BookingCarousel";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ActivityItem,
  CompletedScheduleItem,
  ScheduleItem,
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
