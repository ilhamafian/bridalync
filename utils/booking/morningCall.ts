import type { MorningCallSetting } from "@/schemas/settingSchema";

export const MORNING_CALL_LABEL = "Morning call";
export const DEFAULT_MORNING_CALL_BEFORE = "07:00";

type MorningCallInput = MorningCallSetting | null | undefined;

/** Whether a session starting at `startTime` (HH:mm) gets the morning call charge. */
export function isMorningCallSlot(
  setting: MorningCallInput,
  startTime: string | undefined
): boolean {
  return Boolean(
    setting?.enabled &&
      setting.price > 0 &&
      startTime &&
      startTime < setting.before
  );
}

/** Morning call charge for a set of sessions: `price` once per session starting before the cut-off. */
export function getMorningCallCharge(
  setting: MorningCallInput,
  sessions: Array<{ time_slot?: { startTime: string } | null }>
): { count: number; amountRm: number } | undefined {
  const count = sessions.filter((session) =>
    isMorningCallSlot(setting, session.time_slot?.startTime)
  ).length;
  if (!setting || count === 0) return undefined;
  return { count, amountRm: setting.price * count };
}
