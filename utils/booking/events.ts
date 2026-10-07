import type {
  PackageDayMode,
  PackageSession,
} from "@/schemas/packageSchema";
import type { TimeSlot } from "@/schemas/settingSchema";
import { isSessionSlotTaken, toDateKey } from "@/utils/booking/availability";

type EventLike = {
  name: string;
  sessions?: PackageSession[];
  day_mode?: PackageDayMode;
};

/** The event's sessions in order; events saved before multi-session events have one, named after the event. */
export function getEventSessions(event: EventLike): PackageSession[] {
  if (!event.sessions || event.sessions.length === 0) {
    return [{ name: event.name, order: 0 }];
  }
  return [...event.sessions]
    .sort((a, b) => a.order - b.order)
    .map((session, index) => ({ name: session.name, order: index }));
}

export function getEventDayMode(event: EventLike): PackageDayMode {
  return event.day_mode ?? "same_day";
}

/**
 * Error message when the scheduled session dates break the event's day rule
 * (same day: all on one date; different day: no two on the same date), else null.
 */
export function getDayModeError(
  dayMode: PackageDayMode,
  dates: Array<Date | string>
): string | null {
  const keys = dates.map((date) => toDateKey(date)).filter(Boolean);
  const unique = new Set(keys);
  if (dayMode === "same_day" && unique.size > 1) {
    return "All sessions of this event must be on the same day.";
  }
  if (dayMode === "different_day" && unique.size !== keys.length) {
    return "Each session of this event must be on a different day.";
  }
  return null;
}

/** Whether a date can still be picked for the next session given those already scheduled. */
export function isDateAllowedForEvent(
  dayMode: PackageDayMode,
  date: Date | string,
  scheduledDates: Array<Date | string>
): boolean {
  if (scheduledDates.length === 0) return true;
  const key = toDateKey(date);
  const scheduledKeys = scheduledDates.map((item) => toDateKey(item));
  return dayMode === "same_day"
    ? scheduledKeys.includes(key)
    : !scheduledKeys.includes(key);
}

/** True when two sessions of the same booking overlap in time on the same day. */
export function hasOverlappingSessions(
  sessions: Array<{ date: Date | string; time_slot: TimeSlot }>
): boolean {
  return sessions.some((session, index) =>
    sessions.slice(index + 1).some((other) =>
      isSessionSlotTaken(session, [
        {
          date: toDateKey(other.date),
          startTime: other.time_slot.startTime,
          endTime: other.time_slot.endTime,
        },
      ])
    )
  );
}
