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

export type BlockedDateRange = {
  /** YYYY-MM-DD, inclusive */
  start: string;
  end: string;
  dates: string[];
  /** Latest `created_at` among the range's dates, ISO string. */
  createdAt: string | null;
};

export function nextDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Groups blocked dates into runs of consecutive days, sorted by start date. */
export function groupBlockedDateRanges(
  items: { date: string; createdAt: string | null }[]
): BlockedDateRange[] {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const ranges: BlockedDateRange[] = [];

  for (const item of sorted) {
    const last = ranges.at(-1);
    if (last && nextDateKey(last.end) === item.date) {
      last.end = item.date;
      last.dates.push(item.date);
      if (item.createdAt && (!last.createdAt || item.createdAt > last.createdAt)) {
        last.createdAt = item.createdAt;
      }
    } else {
      ranges.push({
        start: item.date,
        end: item.date,
        dates: [item.date],
        createdAt: item.createdAt,
      });
    }
  }

  return ranges;
}
