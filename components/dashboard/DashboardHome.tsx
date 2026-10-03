"use client";

import Link from "next/link";
import { IconBrandWhatsapp } from "@tabler/icons-react";

import { ActivityList } from "@/components/dashboard/ActivityList";
import { BookingCarousel } from "@/components/dashboard/BookingCarousel";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type ActivityItem,
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

export function EmptyCard({ children }: { children: React.ReactNode }) {
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
            seeMoreHref="/dashboard/bookings?filter=active&sort=upcoming"
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
            seeMoreHref="/dashboard/bookings?filter=completed&sort=latest"
            renderAction={(item) => <LeaveReviewButton item={item} />}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Recent activity</h3>
        {activity.length === 0 ? (
          <EmptyCard>No recent activity yet.</EmptyCard>
        ) : (
          <ActivityList items={activity} />
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
