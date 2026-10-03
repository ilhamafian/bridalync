"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ActivityList } from "@/components/dashboard/ActivityList";
import { BackButton } from "@/components/dashboard/BackButton";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { cn } from "@/lib/utils";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import { getRecentActivity, type ActivityKind } from "@/utils/dashboard";

type NotificationFilter = "all" | "deposit" | "paid" | "cancelled";

const NOTIFICATION_FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "deposit", label: "Deposit" },
  { value: "paid", label: "Full payment" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 20;

function matchesFilter(kind: ActivityKind, filter: NotificationFilter) {
  return filter === "all" || kind === filter;
}

export function NotificationsPage({
  bookings,
}: {
  bookings: SerializedBooking[];
}) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const activity = useMemo(() => getRecentActivity(bookings), [bookings]);
  const filtered = useMemo(
    () => activity.filter((item) => matchesFilter(item.kind, filter)),
    [activity, filter]
  );
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const activeLabel =
    NOTIFICATION_FILTERS.find((option) => option.value === filter)?.label ??
    filter;

  function selectFilter(value: NotificationFilter) {
    setFilter(value);
    setVisibleCount(PAGE_SIZE);
  }

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + PAGE_SIZE);
        }
      },
      {
        root: sentinel.closest("[data-dashboard-scroll]"),
        rootMargin: "0px 0px 300px 0px",
      }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton />

      <div>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          All recent booking and payment activity
        </p>
      </div>

      <div
        role="group"
        aria-label="Filter notifications"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 no-scrollbar lg:-mx-6 lg:px-6"
      >
        {NOTIFICATION_FILTERS.map((option) => {
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => selectFilter(option.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-white/30 text-foreground shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyCard>
          {filter === "all"
            ? "No recent activity yet."
            : `No ${activeLabel.toLowerCase()} activity.`}
        </EmptyCard>
      ) : (
        <>
          <ActivityList items={visible} />
          {hasMore ? (
            <div
              ref={sentinelRef}
              className="py-2 text-center text-xs text-muted-foreground"
            >
              Loading more…
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
