import type { Booking } from "@/schemas/bookingSchema";
import type { TimeSlot } from "@/schemas/settingSchema";

export type PublicBookedSlot = {
  date: string;
  startTime: string;
  endTime: string;
};

type SessionSlotInput = {
  date: Date | string;
  time_slot: TimeSlot;
};

export const BOOKING_TIMEZONE = "Asia/Kuala_Lumpur";

const BLOCKING_BOOKING_STATUSES = new Set<Booking["status"]>([
  "pending",
  "confirmed",
  "completed",
]);

export function toDateKey(date: Date | string): string {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function normalizeSessionDate(date: Date | string): Date {
  const dateKey = toDateKey(date);
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function timeSlotsMatch(left: TimeSlot, right: TimeSlot): boolean {
  return (
    left.startTime === right.startTime && left.endTime === right.endTime
  );
}

function hhmmToMinutes(hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

/** Half-open ranges: 10:00–12:00 and 12:00–14:00 do not overlap. */
export function timeRangesOverlap(left: TimeSlot, right: TimeSlot) {
  const leftStart = hhmmToMinutes(left.startTime);
  const leftEnd = hhmmToMinutes(left.endTime);
  const rightStart = hhmmToMinutes(right.startTime);
  const rightEnd = hhmmToMinutes(right.endTime);
  if (
    leftStart == null ||
    leftEnd == null ||
    rightStart == null ||
    rightEnd == null
  ) {
    return false;
  }

  return leftStart < rightEnd && rightStart < leftEnd;
}

export function getOccupiedSlotsFromBookings(
  bookings: Pick<Booking, "status" | "sessions">[]
): PublicBookedSlot[] {
  const occupied: PublicBookedSlot[] = [];

  for (const booking of bookings) {
    if (!BLOCKING_BOOKING_STATUSES.has(booking.status)) {
      continue;
    }

    for (const session of booking.sessions) {
      if (session.status === "cancelled") {
        continue;
      }

      occupied.push({
        date: toDateKey(session.date),
        startTime: session.time_slot.startTime,
        endTime: session.time_slot.endTime,
      });
    }
  }

  return occupied;
}

export function isSessionSlotTaken(
  session: SessionSlotInput,
  occupiedSlots: PublicBookedSlot[]
): boolean {
  const dateKey = toDateKey(session.date);

  return occupiedSlots.some(
    (slot) =>
      slot.date === dateKey && timeRangesOverlap(slot, session.time_slot)
  );
}

export function isSlotTaken(
  date: Date | undefined,
  slot: TimeSlot,
  occupiedSlots: PublicBookedSlot[],
  currentSessions: SessionSlotInput[] = []
): boolean {
  if (!date) {
    return false;
  }

  const candidate = { date, time_slot: slot };

  if (isSessionSlotTaken(candidate, occupiedSlots)) {
    return true;
  }

  return currentSessions.some((session) =>
    isSessionSlotTaken(candidate, [
      {
        date: toDateKey(session.date),
        startTime: session.time_slot.startTime,
        endTime: session.time_slot.endTime,
      },
    ])
  );
}
