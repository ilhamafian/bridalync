import type { SessionForm } from "@/schemas/sessionSchema";
import type { TimeSlot } from "@/schemas/settingSchema";

import { calculateTravelFeeRm } from "@/utils/booking/travel";

export type QuotationLineItem = {
  label: string;
  amountRm: number;
};

export type BookingQuotationBreakdown = {
  sessions: Array<QuotationLineItem & { sessionKey?: string }>;
  addOns: QuotationLineItem[];
  travelFeeRm: number;
  discountRm?: number;
};

export type BookingQuotationSummary = {
  lineItems: QuotationLineItem[];
  totalRm: number;
  depositRm: number;
  balanceRm: number;
  breakdown?: BookingQuotationBreakdown;
};

export type QuotationLineItemInput = {
  name: string;
  price: number;
  deposit?: number;
};

export type QuotationPackageInput = QuotationLineItemInput & {
  deposit: number;
  /** `client_key` of the session this price belongs to. */
  sessionKey?: string;
  /** Consecutive slots booked for the session; `price` is charged once per slot. */
  slotCount?: number;
};

export function sessionLineItemLabel(name: string, slotCount = 1) {
  return slotCount > 1 ? `${name} × ${slotCount} slots` : name;
}

export type TravelQuotationInput = {
  enabled: boolean;
  ratePerKm: number;
  longDistanceRatePerKm?: number;
  timeSlots: TimeSlot[];
  sessions: Pick<SessionForm, "client_key" | "date" | "time_slot" | "location">[];
  distanceKmBySessionKey: Record<string, number | undefined>;
};

export type CalculateQuotationInput = {
  chargeBy: "package" | "style";
  selectedPackages: QuotationPackageInput[];
  selectedSessionStyles?: QuotationPackageInput[];
  selectedAddOns: QuotationLineItemInput[];
  travel?: TravelQuotationInput;
};

/** Round money to whole ringgit; `formatRm` still shows `.00`. */
export function roundRm(amount: number) {
  return Math.round(amount);
}

export const PROCESSING_FEE_PERCENT = 3;

/** Charged to clients on top of Stripe payments; rounded up to whole ringgit. */
export function calculateProcessingFeeRm(amountRm: number) {
  const rounded = roundRm(amountRm);
  if (rounded <= 0) return 0;
  return Math.ceil((rounded * PROCESSING_FEE_PERCENT) / 100);
}

export function formatRm(amount: number) {
  const rounded = roundRm(amount);
  return `${rounded < 0 ? "-" : ""}RM${Math.abs(rounded).toLocaleString(
    "en-MY",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )}`;
}

export function getEarliestSessionDate(
  sessions: Array<{ date: Date | string }>
): Date | null {
  if (sessions.length === 0) return null;

  let earliest: Date | null = null;
  for (const session of sessions) {
    const date =
      session.date instanceof Date ? session.date : new Date(session.date);
    if (Number.isNaN(date.getTime())) continue;
    if (!earliest || date.getTime() < earliest.getTime()) {
      earliest = date;
    }
  }
  return earliest;
}

/** Whole calendar days from today (local) until the session date. */
export function daysUntilSessionDate(sessionDate: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(sessionDate);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * When the earliest session is closer than `balance_due_before` days,
 * deposit is no longer allowed — full payment only.
 */
export function requiresFullPayment(
  sessions: Array<{ date: Date | string }>,
  balanceDueBeforeDays: number
) {
  const earliest = getEarliestSessionDate(sessions);
  if (!earliest) return false;
  return daysUntilSessionDate(earliest) < balanceDueBeforeDays;
}

export function applyPaymentOption(
  quotation: BookingQuotationSummary,
  paymentOption: "deposit" | "full"
): BookingQuotationSummary {
  if (paymentOption === "full") {
    return {
      ...quotation,
      depositRm: quotation.totalRm,
      balanceRm: 0,
    };
  }
  return quotation;
}

/** Lowers the total to `totalRm`, recording the difference as a discount. */
export function applyDiscountedTotal(
  quotation: BookingQuotationSummary,
  totalRm: number
): BookingQuotationSummary {
  const discountedTotalRm = roundRm(totalRm);
  if (discountedTotalRm > quotation.totalRm) {
    throw new Error(
      `Total can't be more than the full price of ${formatRm(quotation.totalRm)}.`
    );
  }
  const discountRm = quotation.totalRm - discountedTotalRm;
  if (discountRm <= 0) return quotation;

  const depositRm = Math.min(quotation.depositRm, discountedTotalRm);
  return {
    lineItems: [
      ...quotation.lineItems,
      { label: "Discount", amountRm: -discountRm },
    ],
    totalRm: discountedTotalRm,
    depositRm,
    balanceRm: discountedTotalRm - depositRm,
    ...(quotation.breakdown
      ? { breakdown: { ...quotation.breakdown, discountRm } }
      : {}),
  };
}

export function calculateBookingQuotation(
  input: CalculateQuotationInput
): BookingQuotationSummary {
  const lineItems: QuotationLineItem[] = [];
  const sessionPrices: BookingQuotationBreakdown["sessions"] = [];

  const travelFeeRm =
    input.travel?.enabled === true
      ? calculateTravelFeeRm({
          sessions: input.travel.sessions,
          timeSlots: input.travel.timeSlots,
          ratePerKm: input.travel.ratePerKm,
          longDistanceRatePerKm: input.travel.longDistanceRatePerKm,
          distanceKmBySessionKey: input.travel.distanceKmBySessionKey,
        })
      : 0;

  const priced =
    input.chargeBy === "package"
      ? input.selectedPackages
      : (input.selectedSessionStyles ?? []);

  priced.forEach((item, index) => {
    const slotCount = Math.max(1, item.slotCount ?? 1);
    const label = sessionLineItemLabel(item.name, slotCount);
    const price = item.price * slotCount;
    lineItems.push({
      label,
      amountRm: roundRm(price + (index === 0 ? travelFeeRm : 0)),
    });
    sessionPrices.push({
      label,
      amountRm: roundRm(price),
      ...(item.sessionKey ? { sessionKey: item.sessionKey } : {}),
    });
  });

  const addOnPrices = input.selectedAddOns.map((addOn) => ({
    label: addOn.name,
    amountRm: roundRm(addOn.price),
  }));
  lineItems.push(...addOnPrices);

  const totalRm = lineItems.reduce((sum, item) => sum + item.amountRm, 0);
  const depositRm = roundRm(
    input.chargeBy === "style"
      ? (input.selectedSessionStyles ?? []).reduce(
          (sum, style) => sum + style.deposit,
          0
        )
      : input.selectedPackages.reduce((sum, pkg) => sum + pkg.deposit, 0)
  );
  const cappedDepositRm = Math.min(depositRm, totalRm);
  const balanceRm = Math.max(totalRm - cappedDepositRm, 0);

  return {
    lineItems,
    totalRm,
    depositRm: cappedDepositRm,
    balanceRm,
    breakdown: {
      sessions: sessionPrices,
      addOns: addOnPrices,
      travelFeeRm: roundRm(travelFeeRm),
    },
  };
}

/** @deprecated Use BookingQuotationSummary */
export type BookingInvoiceSummary = BookingQuotationSummary;

/** @deprecated Use calculateBookingQuotation */
export function calculateBookingInvoice(
  packageId: string,
  addOnIds: string[]
): BookingQuotationSummary {
  return calculateBookingQuotation({
    chargeBy: "package",
    selectedPackages: [{ name: packageId, price: 0, deposit: 0 }],
    selectedAddOns: addOnIds.map((id) => ({ name: id, price: 0 })),
  });
}
