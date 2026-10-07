"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconChecks } from "@tabler/icons-react";

import { ActivityList } from "@/components/dashboard/ActivityList";
import { BackButton } from "@/components/dashboard/BackButton";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { FilterPills } from "@/components/dashboard/FilterPills";
import { Button } from "@/components/ui/button";
import type { ActivityItem, ActivityKind } from "@/utils/activity";

type NotificationFilter =
  | "all"
  | "request"
  | "deposit"
  | "balance"
  | "full"
  | "cancelled";

const NOTIFICATION_FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "request", label: "Requests" },
  { value: "deposit", label: "Deposit" },
  { value: "balance", label: "Balance payment" },
  { value: "full", label: "Full payment" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 20;

function matchesFilter(kind: ActivityKind, filter: NotificationFilter) {
  return filter === "all" || kind === filter;
}

export function NotificationsPage({
  activity,
  unreadCount,
  isUnread,
  onOpen,
  onMarkAllRead,
}: {
  activity: ActivityItem[];
  unreadCount: number;
  isUnread: (item: ActivityItem) => boolean;
  onOpen: (item: ActivityItem) => void;
  onMarkAllRead: () => void;
}) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "All recent booking and payment activity"}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={onMarkAllRead}
          >
            <IconChecks className="size-4" aria-hidden />
            Mark all as read
          </Button>
        ) : null}
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
          <ActivityList items={visible} isUnread={isUnread} onOpen={onOpen} />
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
