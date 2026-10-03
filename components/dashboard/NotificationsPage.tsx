"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ActivityList } from "@/components/dashboard/ActivityList";
import { BackButton } from "@/components/dashboard/BackButton";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { FilterPills } from "@/components/dashboard/FilterPills";
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

      <FilterPills
        label="Filter notifications"
        options={NOTIFICATION_FILTERS}
        value={filter}
        onChange={selectFilter}
      />

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
