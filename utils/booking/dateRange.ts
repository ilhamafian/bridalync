import { eachDayOfInterval, format, isSameDay } from "date-fns";
import type { DateRange } from "react-day-picker";

import { toDateKey } from "@/utils/booking/availability";

export const MAX_DATE_RANGE_DAYS = 62;

/** Splits date keys into batches the date APIs accept (max `MAX_DATE_RANGE_DAYS` each). */
export function chunkDateKeys(dateKeys: string[]): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < dateKeys.length; i += MAX_DATE_RANGE_DAYS) {
    chunks.push(dateKeys.slice(i, i + MAX_DATE_RANGE_DAYS));
  }
  return chunks;
}

export function dateKeysFromRange(range: DateRange | undefined): string[] {
  if (!range?.from) return [];
  const end = range.to ?? range.from;
  return eachDayOfInterval({ start: range.from, end })
    .map((date) => toDateKey(date))
    .filter(Boolean);
}

export function formatDateRangeLabel(range: DateRange | undefined): string | null {
  if (!range?.from) return null;
  if (!range.to || isSameDay(range.from, range.to)) {
    return format(range.from, "d MMM yyyy");
  }
  return `${format(range.from, "d MMM")} – ${format(range.to, "d MMM yyyy")}`;
}

function parseKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

/** Title for an inclusive run of YYYY-MM-DD keys, e.g. "3 – 5 Oct 2026". */
export function formatDateKeyRangeTitle(startKey: string, endKey: string) {
  const start = parseKey(startKey);
  if (startKey === endKey) return format(start, "EEE, d MMM yyyy");

  const end = parseKey(endKey);
  if (start.getFullYear() !== end.getFullYear()) {
    return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
  }
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, "d")} – ${format(end, "d MMM yyyy")}`;
  }
  return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

/** e.g. "3 days · Fri – Sun"; null for a single day. */
export function formatDateKeyRangeSpan(startKey: string, endKey: string, days: number) {
  if (days === 1) return null;
  return `${days} days · ${format(parseKey(startKey), "EEE")} – ${format(parseKey(endKey), "EEE")}`;
}
