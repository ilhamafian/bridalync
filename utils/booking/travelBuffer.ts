import type { Booking } from "@/schemas/bookingSchema";
import type { RegionId, TimeSlot } from "@/schemas/settingSchema";
import {
  bookingSessionsOverlap,
  SLOT_HOLDING_STATUSES,
  toDateKey,
} from "@/utils/booking/availability";

type BufferSession = {
  date: Date | string;
  status?: string;
  region?: RegionId | null;
};

type BufferBooking = {
  status: Booking["status"];
  sessions: BufferSession[];
};

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

/** Day before and after every active session whose venue is in one of `regions`, ignoring the booking status. */
export function getBookingBufferDateKeys(
  booking: Pick<BufferBooking, "sessions">,
  regions: readonly RegionId[] | undefined
): Set<string> {
  const keys = new Set<string>();
  if (!regions?.length) return keys;

  for (const session of booking.sessions) {
    if (session.status === "cancelled" || !session.region) continue;
    if (!regions.includes(session.region)) continue;
    const dateKey = toDateKey(session.date);
    if (!dateKey) continue;
    keys.add(shiftDateKey(dateKey, -1));
    keys.add(shiftDateKey(dateKey, 1));
  }
  return keys;
}

/** Travel buffer days from slot-holding bookings; clients can't book on them. */
export function getTravelBufferDateKeys(
  bookings: BufferBooking[],
  regions: readonly RegionId[] | undefined
): Set<string> {
  const keys = new Set<string>();
  if (!regions?.length) return keys;

  for (const booking of bookings) {
    if (!SLOT_HOLDING_STATUSES.includes(booking.status)) continue;
    for (const key of getBookingBufferDateKeys(booking, regions)) keys.add(key);
  }
  return keys;
}

type SlotBooking = BufferBooking & {
  _id: string;
  sessions: Array<BufferSession & { time_slot: TimeSlot }>;
};

/**
 * Booked clients and open requests a day away from `request` across an out-of-state session (either side's travel
 * buffer day). Approving never cancels or declines them; the stylist is only warned. Same-slot requests are skipped
 * (approving declines those). One entry per booking, with its first clashing session date.
 */
export function findTravelDayClashes<T extends SlotBooking>(
  request: SlotBooking,
  bookings: T[],
  regions: readonly RegionId[] | undefined
): Array<{ booking: T; date: Date | string }> {
  if (!regions?.length) return [];
  const requestBuffer = getBookingBufferDateKeys(request, regions);

  const clashes: Array<{ booking: T; date: Date | string }> = [];
  for (const booking of bookings) {
    if (booking._id === request._id) continue;
    const isRequest = booking.status === "requested";
    if (!isRequest && !SLOT_HOLDING_STATUSES.includes(booking.status)) continue;
    if (isRequest && bookingSessionsOverlap(booking, request)) continue;

    const activeSessions = booking.sessions.filter(
      (item) => item.status !== "cancelled"
    );
    // The other booking sits on a travel day of this (out-of-state) request...
    const onRequestBuffer = activeSessions.find((item) =>
      requestBuffer.has(toDateKey(item.date))
    );
    // ...or this request sits on a travel day of the other (out-of-state) booking.
    const requestOnOtherBuffer = hasSessionOnDates(
      request,
      getBookingBufferDateKeys(booking, regions)
    );
    const session =
      onRequestBuffer ?? (requestOnOtherBuffer ? activeSessions[0] : undefined);
    if (session) clashes.push({ booking, date: session.date });
  }
  return clashes;
}

/** True when any active session of `booking` falls on one of `dateKeys`. */
export function hasSessionOnDates(
  booking: Pick<BufferBooking, "sessions">,
  dateKeys: Set<string>
): boolean {
  if (dateKeys.size === 0) return false;
  return booking.sessions.some(
    (session) =>
      session.status !== "cancelled" && dateKeys.has(toDateKey(session.date))
  );
}
