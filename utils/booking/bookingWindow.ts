import { BOOKING_TIMEZONE, toDateKey } from "@/utils/booking/availability";

export function getCurrentBookingYear(now: Date = new Date()): number {
  const yearPart = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
  }).format(now);
  return Number.parseInt(yearPart, 10);
}

/** Today's YYYY-MM-DD in the booking timezone. */
export function getTodayBookingDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function getDefaultMaxBookingYear(now: Date = new Date()): number {
  return getCurrentBookingYear(now) + 1;
}

export function getEffectiveMaxBookingYear(
  storedMaxYear: number | null | undefined,
  now: Date = new Date()
): number {
  if (
    typeof storedMaxYear === "number" &&
    Number.isFinite(storedMaxYear) &&
    storedMaxYear > 0
  ) {
    return storedMaxYear;
  }
  return getDefaultMaxBookingYear(now);
}

/**
 * Last date (YYYY-MM-DD, inclusive) clients may book. Uses `booking_until` when set,
 * else 31 Dec of the legacy `max_booking_year` (default: next year).
 */
export function getEffectiveBookingUntil(
  setting:
    | { booking_until?: string | null; max_booking_year?: number | null }
    | null
    | undefined,
  now: Date = new Date()
): string {
  if (setting?.booking_until && /^\d{4}-\d{2}-\d{2}$/.test(setting.booking_until)) {
    return setting.booking_until;
  }
  return `${getEffectiveMaxBookingYear(setting?.max_booking_year, now)}-12-31`;
}

export function isPastBookingWindow(
  date: Date | string,
  bookingUntil: string
): boolean {
  const dateKey = toDateKey(date);
  if (!dateKey) return false;
  return dateKey > bookingUntil;
}
