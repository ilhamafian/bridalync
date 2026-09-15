import { BOOKING_TIMEZONE, toDateKey } from "@/utils/booking/availability";

export function getCurrentBookingYear(now: Date = new Date()): number {
  const yearPart = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
  }).format(now);
  return Number.parseInt(yearPart, 10);
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

export function getDateBookingYear(date: Date | string): number | null {
  const dateKey = toDateKey(date);
  if (!dateKey) return null;
  const year = Number.parseInt(dateKey.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

export function isYearBlocked(
  date: Date | string,
  maxBookingYear: number
): boolean {
  const year = getDateBookingYear(date);
  if (year === null) return false;
  return year > maxBookingYear;
}
