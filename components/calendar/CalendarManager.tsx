"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PackageItem, StyleItem } from "@/components/PackagesManager";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

import type { CalendarEvent, CalendarView } from "./calendar-types";
import {
  bookingsToCalendarEvents,
  formatViewTitle,
  getDaysInView,
  shiftCursor,
} from "./calendar-utils";
import { CalendarToolsMenu } from "./CalendarToolsMenu";
import { DayStrip } from "./DayStrip";
import { EventDetailSheet } from "./EventDetailSheet";
import { MonthView } from "./MonthView";
import { TimeGrid } from "./TimeGrid";

export function CalendarManager({
  initialBookings,
  chargeBy,
  packages,
  styles,
  maxBookingYear,
}: {
  initialBookings: SerializedBooking[];
  chargeBy: "package" | "style";
  packages: PackageItem[];
  styles: StyleItem[];
  maxBookingYear?: number;
}) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [blockedKeys, setBlockedKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [hotKeys, setHotKeys] = useState<Set<string>>(() => new Set());

  const loadAvailability = useCallback(async () => {
    try {
      const [blockedResponse, hotResponse] = await Promise.all([
        fetch("/api/blocked-dates"),
        fetch("/api/hot-dates"),
      ]);
      const blockedData = await blockedResponse.json().catch(() => ({}));
      const hotData = await hotResponse.json().catch(() => ({}));

      const blocked =
        (blockedData.blocked_dates as Array<{ date?: string }> | undefined) ??
        [];
      const hot =
        (hotData.hot_dates as Array<{ date?: string }> | undefined) ?? [];

      setBlockedKeys(
        new Set(blocked.map((item) => item.date).filter(Boolean) as string[])
      );
      setHotKeys(
        new Set(hot.map((item) => item.date).filter(Boolean) as string[])
      );
    } catch {
      // Keep the last known markers if a refresh fails.
    }
  }, []);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const events = useMemo(
    () => bookingsToCalendarEvents(initialBookings),
    [initialBookings]
  );

  const days = useMemo(() => getDaysInView(cursor, view), [cursor, view]);
  const weekDays = useMemo(() => getDaysInView(cursor, "week"), [cursor]);

  function handleSelectDay(day: Date) {
    setCursor(day);
    setView("day");
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 overflow-x-hidden">
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <CalendarToolsMenu
            chargeBy={chargeBy}
            packages={packages}
            styles={styles}
            maxBookingYear={maxBookingYear}
            onAvailabilityChange={loadAvailability}
          />
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous"
              onClick={() =>
                setCursor((current) => shiftCursor(current, view, -1))
              }
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <h2 className="min-w-0 flex-1 truncate text-center text-sm font-semibold tracking-tight sm:text-lg">
              {formatViewTitle(cursor, view, isMobile)}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next"
              onClick={() =>
                setCursor((current) => shiftCursor(current, view, 1))
              }
            >
              <IconChevronRight className="size-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setCursor(new Date())}
          >
            Today
          </Button>
        </div>

        <Tabs
          value={view}
          onValueChange={(value) => setView(value as CalendarView)}
          className="w-full"
        >
          <TabsList className="w-full max-w-none">
            <TabsTrigger value="day" className="flex-1">
              Day
            </TabsTrigger>
            <TabsTrigger value="week" className="flex-1">
              Week
            </TabsTrigger>
            <TabsTrigger value="month" className="flex-1">
              Month
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {view === "day" ? (
          <DayStrip
            days={weekDays}
            selected={cursor}
            blockedKeys={blockedKeys}
            hotKeys={hotKeys}
            onSelectDay={setCursor}
          />
        ) : null}

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-destructive" />
            Blocked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            Hot date
          </span>
        </div>
      </div>

      {view === "month" ? (
        <div className="px-4 lg:px-6">
          <MonthView
            cursor={cursor}
            days={days}
            events={events}
            blockedKeys={blockedKeys}
            hotKeys={hotKeys}
            onSelectDay={handleSelectDay}
            onSelectEvent={setSelectedEvent}
          />
        </div>
      ) : (
        <TimeGrid
          days={days}
          events={events}
          blockedKeys={blockedKeys}
          hotKeys={hotKeys}
          onSelectDay={view === "week" ? handleSelectDay : undefined}
          onSelectEvent={setSelectedEvent}
        />
      )}

      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
