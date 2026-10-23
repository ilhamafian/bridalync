"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBrandWhatsapp } from "@tabler/icons-react";

import { ActivityList } from "@/components/dashboard/ActivityList";
import {
  BookingCarousel,
  CardCarousel,
} from "@/components/dashboard/BookingCarousel";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  HomePendingPaymentCard,
  type PendingPaymentItem,
} from "@/components/dashboard/HomePendingPaymentCard";
import {
  HomeRequestCard,
  type HomeRequestItem,
} from "@/components/dashboard/HomeRequestCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/utils/activity";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import {
  getGreeting,
  type CompletedScheduleItem,
  type ScheduleItem,
} from "@/utils/dashboard";

export type DashboardHomeProps = {
  firstName: string;
  upcomingThisWeek: number;
  todaysSchedule: ScheduleItem[];
  upcoming: ScheduleItem[];
  completed: CompletedScheduleItem[];
  activity: ActivityItem[];
};

/** Local-time greeting; "Hello" until mounted so SSR matches the first client paint. */
function useLocalGreeting() {
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    setGreeting(getGreeting());
  }, []);
  return greeting;
}

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
  firstName,
  upcomingThisWeek,
  todaysSchedule,
  upcoming,
  completed,
  activity,
  requests,
  pendingPayments,
  isActivityUnread,
  onOpenActivity,
  onBookingUpdated,
  onBookingsDeclined,
}: DashboardHomeProps & {
  /** Open booking requests (first 3) and the total; `null` or none hides the section. */
  requests: { items: HomeRequestItem[]; total: number } | null;
  /** Receipts waiting for review (first 3) and the total; `null` or none hides the section. */
  pendingPayments: { items: PendingPaymentItem[]; total: number } | null;
  isActivityUnread?: (item: ActivityItem) => boolean;
  onOpenActivity?: (item: ActivityItem) => void;
  onBookingUpdated?: (booking: SerializedBooking) => void;
  onBookingsDeclined?: (ids: string[]) => void;
}) {
  const greeting = useLocalGreeting();
  const showToday = todaysSchedule.length > 0;
  const bookings = showToday ? todaysSchedule : upcoming;

  return (
    <div className="flex flex-col gap-4 px-4 md:gap-6 md:px-8">
      <section className="pr-24 md:pr-0">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
          {greeting}, {firstName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You have {upcomingThisWeek} upcoming booking
          {upcomingThisWeek === 1 ? "" : "s"} this week.
        </p>
      </section>

      <div className="flex flex-col gap-4 md:gap-6 @5xl/main:grid @5xl/main:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] @5xl/main:items-start @5xl/main:gap-8">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          {requests && requests.items.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">
                Booking requests
                <span className="text-muted-foreground">
                  {" "}
                  · {requests.total}
                </span>
              </h3>
              <CardCarousel
                items={requests.items}
                getKey={(item) => item.booking._id}
                seeMoreHref="/dashboard/bookings?filter=requests"
                renderItem={(item, className) => (
                  <HomeRequestCard
                    item={item}
                    className={className}
                    onBookingUpdated={onBookingUpdated}
                    onBookingsDeclined={onBookingsDeclined}
                  />
                )}
              />
            </section>
          ) : null}

          {pendingPayments && pendingPayments.items.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">
                Pending payments
                <span className="text-muted-foreground">
                  {" "}
                  · {pendingPayments.total}
                </span>
              </h3>
              <CardCarousel
                items={pendingPayments.items}
                getKey={(item) => item.booking._id}
                seeMoreHref="/dashboard/bookings?filter=needs_verification"
                renderItem={(item, className) => (
                  <HomePendingPaymentCard item={item} className={className} />
                )}
              />
            </section>
          ) : null}

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
        </div>

        <section className="flex min-w-0 flex-col gap-3 @5xl/main:sticky @5xl/main:top-4">
          <h3 className="text-sm font-medium">Recent activity</h3>
          {activity.length === 0 ? (
            <EmptyCard>No recent activity yet.</EmptyCard>
          ) : (
            <ActivityList
              items={activity}
              isUnread={isActivityUnread}
              onOpen={onOpenActivity}
            />
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
    </div>
  );
}
