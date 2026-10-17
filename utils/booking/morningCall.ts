import type { MorningCallSetting } from "@/schemas/settingSchema";
import type {
  BookingQuotationBreakdown,
  QuotationLineItem,
} from "@/utils/booking/pricing";

export const MORNING_CALL_LABEL = "Morning call";
export const DEFAULT_MORNING_CALL_BEFORE = "07:00";

type MorningCallInput = MorningCallSetting | null | undefined;

/** Whether clients see Morning call as its own priced line. Missing = shown. */
export function showsMorningCallPrice(setting: MorningCallInput): boolean {
  return setting?.show_price !== false;
}

export function morningCallLineLabel(count = 1): string {
  return count > 1 ? `${MORNING_CALL_LABEL} × ${count}` : MORNING_CALL_LABEL;
}

/** Split `morningCallRm` out of session rows when the stylist shows the price. */
export function expandSessionLinesWithMorningCall(
  sessions: Array<{
    label: string;
    amountRm: number;
    morningCallRm?: number;
    morningCallCount?: number;
  }>,
  showPrice: boolean
): QuotationLineItem[] {
  return sessions.flatMap(
    ({ label, amountRm, morningCallRm, morningCallCount }) => {
      if (showPrice && morningCallRm) {
        return [
          { label, amountRm: amountRm - morningCallRm },
          {
            label: morningCallLineLabel(morningCallCount ?? 1),
            amountRm: morningCallRm,
          },
        ];
      }
      return [{ label, amountRm }];
    }
  );
}

/**
 * Booking quotation / invoice line items for display. When showing the morning
 * call price, peels it out of the folded session rows using the breakdown.
 */
export function quotationLineItemsForDisplay(
  lineItems: QuotationLineItem[],
  breakdown: BookingQuotationBreakdown | undefined,
  showMorningCallPrice: boolean
): QuotationLineItem[] {
  if (!showMorningCallPrice || !breakdown?.sessions.length) {
    return lineItems;
  }

  const sessionCount = breakdown.sessions.length;
  const sessionLines = lineItems.slice(0, sessionCount);
  const rest = lineItems.slice(sessionCount);
  const expanded = sessionLines.flatMap((line, index) => {
    const session = breakdown.sessions[index];
    const morningCallRm = session?.morningCallRm;
    if (!morningCallRm) return [line];
    return [
      { label: line.label, amountRm: line.amountRm - morningCallRm },
      {
        label: morningCallLineLabel(session.morningCallCount ?? 1),
        amountRm: morningCallRm,
      },
    ];
  });
  return [...expanded, ...rest];
}

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
