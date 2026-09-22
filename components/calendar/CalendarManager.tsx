"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import type { PackageItem, StyleItem } from "@/components/PackagesManager";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

import type { CalendarEvent, CalendarView } from "./calendar-types";
import {
  bookingsToCalendarEvents,
  formatViewTitle,
  getDaysInView,
  minutesToHhmm,
  shiftCursor,
} from "./calendar-utils";
import { CalendarToolsMenu } from "./CalendarToolsMenu";
import { BlockedMarker, HotMarker } from "./CalendarMarkers";
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
  const router = useRouter();
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [bookings, setBookings] = useState(initialBookings);
  const [openGoogleImport, setOpenGoogleImport] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [blockedKeys, setBlockedKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [hotKeys, setHotKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      setOpenGoogleImport(true);
    }
    const googleErr = params.get("google_error");
    if (googleErr === "denied") {
      setGoogleError("Google Calendar access was not granted.");
    } else if (googleErr === "config") {
      setGoogleError("Google Calendar is not configured yet.");
    } else if (googleErr) {
      setGoogleError("Could not connect Google Calendar. Try again.");
    }
    if (params.has("google") || params.has("google_error")) {
      window.history.replaceState({}, "", "/dashboard/calendar");
    }
  }, []);

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
    () => bookingsToCalendarEvents(bookings),
    [bookings]
  );

  const days = useMemo(() => getDaysInView(cursor, view), [cursor, view]);
  const weekDays = useMemo(() => getDaysInView(cursor, "week"), [cursor]);

  function handleSelectDay(day: Date) {
    setCursor(day);
    setView("day");
  }

  async function handleReschedule(
    event: CalendarEvent,
    next: { start: Date; end: Date }
  ) {
    const previousBookings = bookings;
    const startTime = minutesToHhmm(
      next.start.getHours() * 60 + next.start.getMinutes()
    );
    const endTime = minutesToHhmm(
      next.end.getHours() * 60 + next.end.getMinutes()
    );
    const nextDateIso = next.start.toISOString();

    setBookings((current) =>
      current.map((booking) => {
        if (booking._id !== event.bookingId) return booking;
        return {
          ...booking,
          sessions: booking.sessions.map((session, index) => {
            const key = session.client_key ?? String(index);
            if (key !== event.clientKey) return session;
            return {
              ...session,
              date: nextDateIso,
              time_slot: { startTime, endTime },
            };
          }),
        };
      })
    );

    try {
      const response = await fetch(`/api/bookings/${event.bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_key: event.clientKey,
          date: next.start,
          time_slot: { startTime, endTime },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not reschedule session."
        );
      }
      const updated = data.booking as SerializedBooking | undefined;
      if (updated) {
        setBookings((current) =>
          current.map((booking) =>
            booking._id === updated._id ? updated : booking
          )
        );
      }
    } catch (error) {
      setBookings(previousBookings);
      toast.destructive({
        title: "Reschedule failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not update the session time.",
      });
    }
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
            openGoogleImport={openGoogleImport}
            onAvailabilityChange={loadAvailability}
            onImported={(imported) => {
              if (imported.length === 0) return;
              setBookings((current) => {
                const existing = new Set(current.map((booking) => booking._id));
                return [
                  ...imported.filter((booking) => !existing.has(booking._id)),
                  ...current,
                ];
              });
              router.refresh();
            }}
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

        <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <BlockedMarker className="text-[11px]" />
            <HotMarker className="text-[11px]" />
          </div>
          {googleError ? (
            <p className="text-destructive">{googleError}</p>
          ) : null}
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
          onReschedule={handleReschedule}
        />
      )}

      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
