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
      slot.date === dateKey && timeSlotsMatch(slot, session.time_slot)
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
