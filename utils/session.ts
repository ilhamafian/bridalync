import type { Address } from "@/schemas/addressSchema";
import type { SessionForm } from "@/schemas/sessionSchema";

export function formatSessionSummary(session: SessionForm): string {
  const dateStr = session.date.toLocaleDateString(undefined, {
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
