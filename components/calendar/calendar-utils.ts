import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import { toDateKey } from "@/utils/booking/availability";

import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  CALENDAR_SNAP_MINUTES,
  type CalendarEvent,
  type CalendarView,
} from "./calendar-types";

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export function bookingsToCalendarEvents(
  bookings: SerializedBooking[]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const booking of bookings) {
    if (booking.status === "failed" || booking.status === "cancelled") {
      continue;
    }

    booking.sessions.forEach((session, index) => {
      if (session.status === "cancelled") return;

      const day = startOfDay(new Date(session.date));
      if (Number.isNaN(day.getTime())) return;

      const start = combineDateAndTime(day, session.time_slot.startTime);
      const end = combineDateAndTime(day, session.time_slot.endTime);
      if (!start || !end) return;

      const clientKey = session.client_key ?? String(index);

      events.push({
        id: `${booking._id}-${clientKey}`,
        bookingId: booking._id,
        clientKey,
        title: session.name || booking.packageNames || "Session",
        clientName: booking.contact.name,
        packageName: booking.packageNames,
        styleName: session.styleName,
        start,
        end,
        status: booking.status,
        sessionStatus: session.status,
        contact: booking.contact,
        location: session.location ?? null,
        invoice: booking.invoice,
        paymentOption: booking.paymentOption,
        source: booking.source ?? "bridalync",
      });
    });
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function combineDateAndTime(day: Date, hhmm: string): Date | null {
  const parsed = parse(hhmm, "HH:mm", day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getVisibleRange(cursor: Date, view: CalendarView) {
  if (view === "day") {
    const day = startOfDay(cursor);
    return { start: day, end: day };
  }

  if (view === "week") {
    return {
      start: startOfWeek(cursor, WEEK_OPTIONS),
      end: endOfWeek(cursor, WEEK_OPTIONS),
    };
  }

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  return {
    start: startOfWeek(monthStart, WEEK_OPTIONS),
    end: endOfWeek(monthEnd, WEEK_OPTIONS),
  };
}

export function getDaysInView(cursor: Date, view: CalendarView): Date[] {
  const { start, end } = getVisibleRange(cursor, view);
  return eachDayOfInterval({ start, end });
}

export function shiftCursor(cursor: Date, view: CalendarView, direction: -1 | 1) {
  if (view === "day") return addDays(cursor, direction);
  if (view === "week") {
    return direction === 1 ? addWeeks(cursor, 1) : subWeeks(cursor, 1);
  }
  return direction === 1 ? addMonths(cursor, 1) : subMonths(cursor, 1);
}

export function formatViewTitle(
  cursor: Date,
  view: CalendarView,
  compact = false
) {
  if (view === "day") {
    return format(cursor, compact ? "EEE, d MMM" : "EEEE, d MMMM yyyy");
  }
  if (view === "week") {
    const start = startOfWeek(cursor, WEEK_OPTIONS);
    const end = endOfWeek(cursor, WEEK_OPTIONS);
    if (compact) {
      if (isSameMonth(start, end)) {
        return `${format(start, "d")}–${format(end, "d MMM")}`;
      }
      return `${format(start, "d MMM")}–${format(end, "d MMM")}`;
    }
    if (isSameMonth(start, end)) {
      return `${format(start, "d")} – ${format(end, "d MMMM yyyy")}`;
    }
    return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
  }
  return format(cursor, compact ? "MMM yyyy" : "MMMM yyyy");
}

export function eventsForDay(events: CalendarEvent[], day: Date) {
  return events.filter((event) => isSameDay(event.start, day));
}

export function getHourLabels() {
  const hours: number[] = [];
  for (let hour = CALENDAR_DAY_START_HOUR; hour <= CALENDAR_DAY_END_HOUR; hour++) {
    hours.push(hour);
  }
  return hours;
}

export function getEventOffset(event: Pick<CalendarEvent, "start" | "end">) {
  const startMinutes =
    event.start.getHours() * 60 + event.start.getMinutes();
  const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
  const gridStart = CALENDAR_DAY_START_HOUR * 60;
  const gridEnd = CALENDAR_DAY_END_HOUR * 60;

  const clampedStart = Math.max(startMinutes, gridStart);
  const clampedEnd = Math.min(endMinutes, gridEnd);
  const duration = Math.max(clampedEnd - clampedStart, 20);

  return {
    startHours: (clampedStart - gridStart) / 60,
    durationHours: duration / 60,
  };
}

export function getNowOffsetHours(now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const gridStart = CALENDAR_DAY_START_HOUR * 60;
  const gridEnd = CALENDAR_DAY_END_HOUR * 60;
  if (minutes < gridStart || minutes > gridEnd) return null;
  return (minutes - gridStart) / 60;
}

export function snapMinutes(totalMinutes: number) {
  return Math.round(totalMinutes / CALENDAR_SNAP_MINUTES) * CALENDAR_SNAP_MINUTES;
}

export function minutesToHhmm(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getEventDurationMinutes(event: Pick<CalendarEvent, "start" | "end">) {
  const startMinutes =
    event.start.getHours() * 60 + event.start.getMinutes();
  const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
  return Math.max(endMinutes - startMinutes, CALENDAR_SNAP_MINUTES);
}

/** Map a Y offset within a day column to a snapped start Date, clamped so duration fits the grid. */
export function pointerToGridStart(
  day: Date,
  offsetY: number,
  hourHeightPx: number,
  durationMinutes: number
): Date {
  const gridStart = CALENDAR_DAY_START_HOUR * 60;
  const gridEnd = CALENDAR_DAY_END_HOUR * 60;
  const maxStart = Math.max(gridStart, gridEnd - durationMinutes);

  const rawMinutesFromGrid = (offsetY / hourHeightPx) * 60;
  const snappedFromGrid = snapMinutes(rawMinutesFromGrid);
  const absoluteMinutes = Math.min(
    Math.max(gridStart + snappedFromGrid, gridStart),
    maxStart
  );

  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  const result = startOfDay(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function addMinutesToDate(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function formatHourLabel(hour: number, compact = false) {
  const date = parse(
    `${String(hour).padStart(2, "0")}:00`,
    "HH:mm",
    new Date()
  );
  if (compact) {
    return format(date, "ha").replace("AM", "a").replace("PM", "p").toLowerCase();
  }
  return format(date, "h a");
}

export function isMarkedDay(day: Date, keys: Set<string>) {
  return keys.has(toDateKey(day));
}

export { WEEK_OPTIONS };
