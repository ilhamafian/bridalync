"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconAdjustmentsHorizontal, IconChecks } from "@tabler/icons-react";

import { ActivityList } from "@/components/dashboard/ActivityList";
import { BackButton } from "@/components/dashboard/BackButton";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { FilterPills } from "@/components/dashboard/FilterPills";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActivityItem, ActivityKind } from "@/utils/activity";

type NotificationSort = "latest" | "earliest";

const NOTIFICATION_SORTS: { value: NotificationSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "earliest", label: "Earliest" },
];

function activityTime(item: ActivityItem) {
  const time = new Date(item.at).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** Current time, ticking every minute; undefined until mounted so server and client render the same. */
function useNow() {
  const [now, setNow] = useState<number>();
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

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
  const [sort, setSort] = useState<NotificationSort>("latest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const now = useNow();

  const filtered = useMemo(() => {
    const direction = sort === "latest" ? -1 : 1;
    return activity
      .filter((item) => matchesFilter(item.kind, filter))
      .sort((a, b) => direction * (activityTime(a) - activityTime(b)));
  }, [activity, filter, sort]);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const activeLabel =
    NOTIFICATION_FILTERS.find((option) => option.value === filter)?.label ??
    filter;

  function selectFilter(value: NotificationFilter) {
    setFilter(value);
    setVisibleCount(PAGE_SIZE);
  }

  function selectSort(value: NotificationSort) {
    setSort(value);
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

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <FilterPills
            label="Filter notifications"
            options={NOTIFICATION_FILTERS}
            value={filter}
            onChange={selectFilter}
            className="mr-0 pr-0 lg:mr-0 lg:pr-0"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Sort notifications"
              className="size-10 shrink-0 rounded-lg border border-zinc-900/10 bg-white/40 shadow-sm backdrop-blur-sm hover:bg-white/50 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <IconAdjustmentsHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-100 w-40 min-w-40">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => selectSort(value as NotificationSort)}
            >
              {NOTIFICATION_SORTS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filtered.length === 0 ? (
        <EmptyCard>
          {filter === "all"
            ? "No recent activity yet."
            : `No ${activeLabel.toLowerCase()} activity.`}
        </EmptyCard>
      ) : (
        <>
          <ActivityList
            items={visible}
            isUnread={isUnread}
            onOpen={onOpen}
            now={now}
          />
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
