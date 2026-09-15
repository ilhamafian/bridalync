import { toDateKey } from "@/utils/booking/availability";

export function buildBlockedDateSet(dates: string[]): Set<string> {
  return new Set(dates.filter(Boolean));
}

export function isDateBlocked(
  date: Date | string,
  blockedKeys: Set<string> | Iterable<string>
): boolean {
  const dateKey = toDateKey(date);
  if (!dateKey) return false;

  if (blockedKeys instanceof Set) {
    return blockedKeys.has(dateKey);
  }

  for (const key of blockedKeys) {
    if (key === dateKey) return true;
  }
  return false;
}
