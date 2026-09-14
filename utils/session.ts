import type { Address } from "@/schemas/addressSchema";
import type { SessionForm } from "@/schemas/sessionSchema";

type SessionSummaryFields = Pick<SessionForm, "name" | "date" | "time_slot">;

function toSessionDate(value: SessionSummaryFields["date"] | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatSessionSummary(
  session: SessionSummaryFields,
  locale = "en-GB"
): string {
  const dateStr = toSessionDate(session.date).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${session.name} — ${dateStr}, ${session.time_slot.startTime} – ${session.time_slot.endTime}`;
}

const PLACEHOLDER_LOCATION_NAMES = new Set([
  "Pinned on map",
  "Selected location",
  "Travel not enabled",
]);

function getVenueName(
  location: Pick<Address, "displayName">
): string | null {
  const name = location.displayName?.trim();
  if (!name || PLACEHOLDER_LOCATION_NAMES.has(name)) return null;
  return name;
}

export function formatLocationAddress(
  location: Pick<Address, "formattedAddress" | "displayName">
): string {
  const venue = getVenueName(location);
  const address = location.formattedAddress.trim();

  if (!venue) return address;
  if (address === venue || address.startsWith(`${venue},`)) return address;

  return `${venue}, ${address}`;
}
