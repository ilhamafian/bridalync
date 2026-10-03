"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  IconCalendarOff,
  IconClockOff,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { BackButton } from "@/components/dashboard/BackButton";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  IconBadge,
  RowText,
  SettingsFeedback,
} from "@/components/dashboard/settings/SettingsUi";
import {
  DateRangeChip,
  DateRangeFilter,
  isDateKeyInRange,
  type DateRange,
} from "@/components/dashboard/DateRangeFilter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toDateKey } from "@/utils/booking/availability";
import {
  groupBlockedDateRanges,
  type BlockedDateRange,
} from "@/utils/booking/blockedDates";
import { MAX_DATE_RANGE_DAYS } from "@/utils/booking/dateRange";
import type { BlockedDateItem } from "@/utils/dashboardShell";

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatRangeTitle(range: BlockedDateRange) {
  const start = parseDateKey(range.start);
  if (range.start === range.end) return format(start, "EEE, d MMM yyyy");

  const end = parseDateKey(range.end);
  if (start.getFullYear() !== end.getFullYear()) {
    return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
  }
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, "d")} – ${format(end, "d MMM yyyy")}`;
  }
  return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

function formatRangeDescription(range: BlockedDateRange) {
  if (range.dates.length === 1) return "Full day";
  const start = parseDateKey(range.start);
  const end = parseDateKey(range.end);
  return `${range.dates.length} days · ${format(start, "EEE")} – ${format(end, "EEE")}`;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function UnblockButton({
  title,
  disabled,
  onConfirm,
}: {
  title: string;
  disabled: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          disabled={disabled}
          aria-label={`Unblock ${title}`}
        >
          <IconTrash />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unblock {title}?</AlertDialogTitle>
          <AlertDialogDescription>
            Clients will be able to book on these dates again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Unblock
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BlockedDatesList({
  ranges,
  filtered,
  busyKey,
  onUnblock,
}: {
  ranges: BlockedDateRange[];
  filtered: boolean;
  busyKey: string | null;
  onUnblock: (range: BlockedDateRange) => void;
}) {
  if (ranges.length === 0) {
    return (
      <EmptyCard>
        {filtered
          ? "No blocked dates in this date range."
          : "No upcoming blocked dates."}
      </EmptyCard>
    );
  }

  return (
    <div className={cn(glassCardClassName, "overflow-hidden")}>
      <ul className="divide-y divide-white/50 dark:divide-white/10">
        {ranges.map((range) => {
          const title = formatRangeTitle(range);
          return (
            <li
              key={range.start}
              className="flex items-center gap-3 py-3 pr-2 pl-4"
            >
              <IconBadge icon={IconCalendarOff} />
              <RowText title={title} description={formatRangeDescription(range)} />
              <UnblockButton
                title={title}
                disabled={busyKey === range.start}
                onConfirm={() => onUnblock(range)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BlockMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="lg" className="shrink-0 rounded-full px-3">
          <IconPlus data-icon="inline-start" />
          Block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-100 w-44 min-w-44">
        <DropdownMenuItem asChild>
          <Link href="/dashboard/blocked/dates/new" scroll={false}>
            <IconCalendarOff />
            Block dates
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/blocked/slots/new" scroll={false}>
            <IconClockOff />
            Block slots
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BlockedPage({ dates }: { dates: BlockedDateItem[] }) {
  const [blockedDates, setBlockedDates] = useState(dates);
  const [range, setRange] = useState<DateRange | undefined>();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const filtered = Boolean(range?.from);

  const ranges = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const visible = blockedDates.filter((item) =>
      range?.from ? isDateKeyInRange(item.date, range) : item.date >= todayKey
    );
    return groupBlockedDateRanges(visible);
  }, [blockedDates, range]);

  async function handleUnblock(range: BlockedDateRange) {
    setBusyKey(range.start);
    setError(null);
    setSuccess(null);

    try {
      for (const dateChunk of chunk(range.dates, MAX_DATE_RANGE_DAYS)) {
        const response = await fetch("/api/blocked-dates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dates: dateChunk, blocked: false }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(
            typeof data.error === "string"
              ? data.error
              : "Could not unblock dates."
          );
          return;
        }
      }

      const removed = new Set(range.dates);
      setBlockedDates((current) =>
        current.filter((item) => !removed.has(item.date))
      );
      setSuccess(
        range.dates.length === 1
          ? "Date unblocked."
          : `${range.dates.length} dates unblocked.`
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Blocked dates & slots</h2>
          <p className="text-sm text-muted-foreground">
            Days and times clients can&apos;t book
          </p>
        </div>
        <BlockMenu />
      </div>

      <SettingsFeedback error={error} success={success} />

      <Tabs defaultValue="dates" className="gap-3">
        <div className="flex items-center gap-2">
          <TabsList className="h-10! min-w-0 flex-1 bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm dark:bg-white/10 dark:ring-white/15">
            <TabsTrigger value="dates" className="text-sm">
              Dates
            </TabsTrigger>
            <TabsTrigger value="slots" className="text-sm">
              Slots
            </TabsTrigger>
          </TabsList>
          <DateRangeFilter
            label="Filter blocked dates and slots by date range"
            value={range}
            onChange={setRange}
          />
        </div>
        <DateRangeChip value={range} onClear={() => setRange(undefined)} />
        <TabsContent value="dates">
          <BlockedDatesList
            ranges={ranges}
            filtered={filtered}
            busyKey={busyKey}
            onUnblock={(range) => void handleUnblock(range)}
          />
        </TabsContent>
        <TabsContent value="slots">
          <EmptyCard>No blocked slots yet.</EmptyCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
