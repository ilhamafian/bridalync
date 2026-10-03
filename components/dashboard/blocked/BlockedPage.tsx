"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  IconCalendarOff,
  IconClockOff,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { BackButton } from "@/components/dashboard/BackButton";
import { parseDateKey } from "@/components/dashboard/DashboardCalendar";
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
import {
  chunkDateKeys,
  formatDateKeyRangeSpan,
  formatDateKeyRangeTitle,
} from "@/utils/booking/dateRange";
import type {
  BlockedDateItem,
  BlockedSlotItem,
} from "@/utils/dashboardShell";

function formatRangeTitle(range: BlockedDateRange) {
  return formatDateKeyRangeTitle(range.start, range.end);
}

function formatRangeDescription(range: BlockedDateRange) {
  return (
    formatDateKeyRangeSpan(range.start, range.end, range.dates.length) ??
    "Full day"
  );
}

function UnblockButton({
  title,
  description,
  disabled,
  onConfirm,
}: {
  title: string;
  description: string;
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
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
                description="Clients will be able to book on these dates again."
                disabled={busyKey === `date:${range.start}`}
                onConfirm={() => onUnblock(range)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function blockedSlotKey(slot: BlockedSlotItem) {
  return `slot:${slot.date}:${slot.startTime}-${slot.endTime}`;
}

function BlockedSlotsList({
  slots,
  filtered,
  busyKey,
  onUnblock,
}: {
  slots: BlockedSlotItem[];
  filtered: boolean;
  busyKey: string | null;
  onUnblock: (slot: BlockedSlotItem) => void;
}) {
  if (slots.length === 0) {
    return (
      <EmptyCard>
        {filtered
          ? "No blocked slots in this date range."
          : "No upcoming blocked slots."}
      </EmptyCard>
    );
  }

  return (
    <div className={cn(glassCardClassName, "overflow-hidden")}>
      <ul className="divide-y divide-white/50 dark:divide-white/10">
        {slots.map((slot) => {
          const key = blockedSlotKey(slot);
          const dateLabel = format(parseDateKey(slot.date), "EEE, d MMM yyyy");
          const timeLabel = `${slot.startTime} – ${slot.endTime}`;
          return (
            <li key={key} className="flex items-center gap-3 py-3 pr-2 pl-4">
              <IconBadge icon={IconClockOff} />
              <RowText title={dateLabel} description={timeLabel} />
              <UnblockButton
                title={`${timeLabel} on ${dateLabel}`}
                description="Clients will be able to book this slot again."
                disabled={busyKey === key}
                onConfirm={() => onUnblock(slot)}
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

export type BlockedTab = "dates" | "slots";

export function BlockedPage({
  dates,
  slots,
  tab,
  onTabChange,
  onDatesChange,
  onSlotsChange,
}: {
  dates: BlockedDateItem[];
  slots: BlockedSlotItem[];
  tab: BlockedTab;
  onTabChange: (tab: BlockedTab) => void;
  onDatesChange: (dates: BlockedDateItem[]) => void;
  onSlotsChange: (slots: BlockedSlotItem[]) => void;
}) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const filtered = Boolean(range?.from);

  const isVisible = useCallback(
    (dateKey: string) =>
      range?.from
        ? isDateKeyInRange(dateKey, range)
        : dateKey >= toDateKey(new Date()),
    [range]
  );

  const ranges = useMemo(
    () => groupBlockedDateRanges(dates.filter((item) => isVisible(item.date))),
    [dates, isVisible]
  );

  const visibleSlots = useMemo(
    () =>
      slots
        .filter((slot) => isVisible(slot.date))
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.startTime.localeCompare(b.startTime)
        ),
    [slots, isVisible]
  );

  async function handleUnblockSlot(slot: BlockedSlotItem) {
    setBusyKey(blockedSlotKey(slot));
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/blocked-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: slot.date,
          slots: [{ startTime: slot.startTime, endTime: slot.endTime }],
          blocked: false,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(
          typeof data.error === "string" ? data.error : "Could not unblock slot."
        );
        return;
      }

      const key = blockedSlotKey(slot);
      onSlotsChange(slots.filter((item) => blockedSlotKey(item) !== key));
      setSuccess("Slot unblocked.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUnblock(range: BlockedDateRange) {
    setBusyKey(`date:${range.start}`);
    setError(null);
    setSuccess(null);

    try {
      for (const dateChunk of chunkDateKeys(range.dates)) {
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
      onDatesChange(dates.filter((item) => !removed.has(item.date)));
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

      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as BlockedTab)}
        className="gap-3"
      >
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
          <BlockedSlotsList
            slots={visibleSlots}
            filtered={filtered}
            busyKey={busyKey}
            onUnblock={(slot) => void handleUnblockSlot(slot)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
