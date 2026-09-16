import { eachDayOfInterval, format, isSameDay } from "date-fns";
import type { DateRange } from "react-day-picker";

import { toDateKey } from "@/utils/booking/availability";

export const MAX_DATE_RANGE_DAYS = 62;

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
