import type { TimeSlot } from "@/schemas/settingSchema";

/**
 * A session may cover several consecutive time slots. "Consecutive" means
 * neighbours in the stylist's time slot list (sorted by start time), even if
 * there's a gap between them. The session stores the merged span
 * (first start → last end); each extra slot is charged the session price again.
 */

function slotKey(slot: TimeSlot) {
  return `${slot.startTime}|${slot.endTime}`;
}

export function sortTimeSlots(timeSlots: TimeSlot[]): TimeSlot[] {
  return [...timeSlots].sort(
    (left, right) =>
      left.startTime.localeCompare(right.startTime) ||
      left.endTime.localeCompare(right.endTime)
  );
}

/** Index range in the sorted slot list covered by `span`, or null if it doesn't line up. */
export function getSlotIndexRange(
  span: TimeSlot,
  timeSlots: TimeSlot[]
): { first: number; last: number } | null {
  const sorted = sortTimeSlots(timeSlots);
  const first = sorted.findIndex((slot) => slot.startTime === span.startTime);
  if (first < 0) return null;
  for (let last = first; last < sorted.length; last++) {
    if (sorted[last].endTime === span.endTime) return { first, last };
  }
  return null;
}

/** Number of slots a session span covers; 1 when it doesn't match the slot list. */
export function countSessionSlots(span: TimeSlot, timeSlots: TimeSlot[]): number {
  const range = getSlotIndexRange(span, timeSlots);
  return range ? range.last - range.first + 1 : 1;
}

/** The individual slots inside a span (just the span itself if it doesn't line up). */
export function expandSessionSlots(span: TimeSlot, timeSlots: TimeSlot[]): TimeSlot[] {
  const range = getSlotIndexRange(span, timeSlots);
  if (!range) return [span];
  return sortTimeSlots(timeSlots).slice(range.first, range.last + 1);
}

/** Merged span of consecutive slots (assumes `slots` is non-empty). */
export function mergeSlots(slots: TimeSlot[]): TimeSlot {
  const sorted = sortTimeSlots(slots);
  return {
    startTime: sorted[0].startTime,
    endTime: sorted[sorted.length - 1].endTime,
  };
}

/**
 * Next selection after tapping `slot`: tapping an end of the current run
 * removes it, a neighbour extends the run, anything else starts a new run.
 */
export function toggleConsecutiveSlot(
  selected: TimeSlot[],
  slot: TimeSlot,
  timeSlots: TimeSlot[]
): TimeSlot[] {
  const sorted = sortTimeSlots(timeSlots);
  const indexOf = (item: TimeSlot) =>
    sorted.findIndex((entry) => slotKey(entry) === slotKey(item));
  const index = indexOf(slot);
  if (index < 0) return [slot];

  const indexes = selected.map(indexOf).filter((i) => i >= 0).sort((a, b) => a - b);
  if (indexes.length === 0) return [slot];

  const first = indexes[0];
  const last = indexes[indexes.length - 1];

  if (indexes.includes(index)) {
    if (index === first) return sorted.slice(first + 1, last + 1);
    if (index === last) return sorted.slice(first, last);
    return [slot];
  }
  if (index === first - 1) return sorted.slice(index, last + 1);
  if (index === last + 1) return sorted.slice(first, index + 1);
  return [slot];
}

export function formatSlotCount(count: number) {
  return `${count} slots`;
}
