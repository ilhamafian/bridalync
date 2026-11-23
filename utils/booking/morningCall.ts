import type { MorningCallSetting } from "@/schemas/settingSchema";
import type {
  BookingQuotationBreakdown,
  QuotationLineItem,
} from "@/utils/booking/pricing";
import { TRAVEL_FEE_LABEL } from "@/utils/booking/travelFee";

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
 * Distance travel fee stays inside the session rows unless the stylist shows it.
 * Session rows in `breakdown` exclude the fee, so showing it uses those amounts
 * and adds one Travel fee line. State prices are not a travel fee (`travelFeeRm` is 0).
 */
function withTravelFeeLine(
  lineItems: QuotationLineItem[],
  breakdown: BookingQuotationBreakdown | undefined,
  showTravelFee: boolean
): QuotationLineItem[] {
  const sessionCount = breakdown?.sessions.length ?? 0;
  if (
    !showTravelFee ||
    !breakdown ||
    breakdown.travelFeeRm <= 0 ||
    sessionCount === 0 ||
    lineItems.length < sessionCount
  ) {
    return lineItems;
  }

  const sessions = lineItems.slice(0, sessionCount).map((line, index) => ({
    label: line.label,
    amountRm: breakdown.sessions[index]?.amountRm ?? line.amountRm,
  }));
  const rest = lineItems.slice(sessionCount);
  const travelLine = {
    label: TRAVEL_FEE_LABEL,
    amountRm: breakdown.travelFeeRm,
  };
  const discountAt = rest.findIndex(
    (item) => item.label === "Discount" && item.amountRm < 0
  );
  if (discountAt === -1) return [...sessions, ...rest, travelLine];
  return [
    ...sessions,
    ...rest.slice(0, discountAt),
    travelLine,
    ...rest.slice(discountAt),
  ];
}

/**
 * Booking quotation / invoice line items for display. The distance travel fee
 * stays folded into the session rows unless `showTravelFee` is set. When showing
 * the morning call price, peels it out of the folded session rows using the breakdown.
 */
export function quotationLineItemsForDisplay(
  lineItems: QuotationLineItem[],
  breakdown: BookingQuotationBreakdown | undefined,
  showMorningCallPrice: boolean,
  showTravelFee = false
): QuotationLineItem[] {
  const items = withTravelFeeLine(lineItems, breakdown, showTravelFee);
  const sessionCount = breakdown?.sessions.length ?? 0;
  if (
    !showMorningCallPrice ||
    !breakdown ||
    sessionCount === 0 ||
    items.length < sessionCount
  ) {
    return items;
  }

  const sessionLines = items.slice(0, sessionCount);
  const rest = items.slice(sessionCount);
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
