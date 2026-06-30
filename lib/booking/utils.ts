import {
  BOOKING_PACKAGES,
  BOOKING_STYLES,
  EVENT_TYPES,
  TIME_SLOTS,
  type BookingPackageId,
  type BookingStyleId,
  type EventTypeId,
  type TimeSlotId,
} from "@/lib/booking/constants";
import type { BookingSession, SessionLocation } from "@/lib/schemas/booking";

export function getPackageById(packageId: BookingPackageId) {
  return BOOKING_PACKAGES.find((pkg) => pkg.id === packageId);
}

export function getRequiredSessionCount(packageId: BookingPackageId) {
  return getPackageById(packageId)?.events.length ?? 0;
}

export function getNextEventToSchedule(
  packageId: BookingPackageId,
  sessions: BookingSession[]
): EventTypeId | null {
  const pkg = getPackageById(packageId);
  if (!pkg) return null;

  const remaining = [...pkg.events];
  for (const session of sessions) {
    const index = remaining.indexOf(session.eventType);
    if (index !== -1) remaining.splice(index, 1);
  }

  return remaining[0] ?? null;
}

export function isPackageScheduleComplete(
  packageId: BookingPackageId,
  sessions: BookingSession[]
) {
  return sessions.length === getRequiredSessionCount(packageId);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getEventTypeLabel(eventType: EventTypeId) {
  return EVENT_TYPES.find((event) => event.id === eventType)?.label ?? eventType;
}

export function getTimeSlotLabel(slotId: TimeSlotId) {
  return TIME_SLOTS.find((slot) => slot.id === slotId)?.label ?? slotId;
}

export function getStyleLabel(styleId: BookingStyleId) {
  return BOOKING_STYLES.find((style) => style.id === styleId)?.label ?? styleId;
}

export function getPackageLabel(packageId: BookingPackageId) {
  return getPackageById(packageId)?.label ?? packageId;
}

export function formatLocationSummary(location: SessionLocation) {
  return location.label;
}

export function formatLocationAddress(location: SessionLocation) {
  return location.address;
}

export function formatSessionDate(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString("default", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatSessionSummary(session: BookingSession) {
  return `${getEventTypeLabel(session.eventType)} — ${formatSessionDate(session.date)}, ${getTimeSlotLabel(session.slotId)}`;
}

export function isSlotTaken(
  dateKey: string,
  slotId: TimeSlotId,
  sessions: BookingSession[]
) {
  return sessions.some(
    (session) => session.date === dateKey && session.slotId === slotId
  );
}

export function getSessionDates(sessions: BookingSession[]) {
  return new Set(sessions.map((session) => session.date));
}
