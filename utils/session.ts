import type { Address } from "@/schemas/addressSchema";
import type { SessionForm } from "@/schemas/sessionSchema";

type SessionSummaryFields = Pick<SessionForm, "name" | "date" | "time_slot">;

function toSessionDate(value: SessionSummaryFields["date"] | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatSessionSummary(session: SessionSummaryFields): string {
  const dateStr = toSessionDate(session.date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${session.name} — ${dateStr}, ${session.time_slot.startTime} – ${session.time_slot.endTime}`;
}

export function formatLocationAddress(location: Address): string {
  return location.formattedAddress;
}
