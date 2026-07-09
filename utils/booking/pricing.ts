import type { SessionForm } from "@/schemas/sessionSchema";
import type { TimeSlot } from "@/schemas/settingSchema";

import { calculateTravelFeeRm } from "@/utils/booking/travel";

export type QuotationLineItem = {
  label: string;
  amountRm: number;
};

export type BookingQuotationSummary = {
  lineItems: QuotationLineItem[];
  totalRm: number;
  depositRm: number;
  balanceRm: number;
};

export type QuotationLineItemInput = {
  name: string;
  price: number;
  deposit?: number;
};

export type QuotationPackageInput = QuotationLineItemInput & {
  deposit: number;
};

export type TravelQuotationInput = {
  enabled: boolean;
  ratePerKm: number;
  timeSlots: TimeSlot[];
  sessions: Pick<SessionForm, "client_key" | "date" | "time_slot" | "location">[];
  distanceKmBySessionKey: Record<string, number | undefined>;
};

export type CalculateQuotationInput = {
  chargeBy: "package" | "style";
  selectedPackage: QuotationPackageInput | null;
  selectedStyle: QuotationLineItemInput | null;
  selectedAddOns: QuotationLineItemInput[];
  travel?: TravelQuotationInput;
};

/** Round money to whole ringgit; `formatRm` still shows `.00`. */
export function roundRm(amount: number) {
  return Math.round(amount);
}

export function formatRm(amount: number) {
  return `RM${roundRm(amount).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

export function calculateBookingQuotation(
  input: CalculateQuotationInput
): BookingQuotationSummary {
  const lineItems: QuotationLineItem[] = [];

  const travelFeeRm =
    input.travel?.enabled === true
      ? calculateTravelFeeRm({
          sessions: input.travel.sessions,
          timeSlots: input.travel.timeSlots,
          ratePerKm: input.travel.ratePerKm,
          distanceKmBySessionKey: input.travel.distanceKmBySessionKey,
        })
      : 0;

  if (input.chargeBy === "package" && input.selectedPackage) {
    lineItems.push({
      label: input.selectedPackage.name,
      amountRm: roundRm(input.selectedPackage.price + travelFeeRm),
    });
  }

  if (input.chargeBy === "style" && input.selectedStyle) {
    lineItems.push({
      label: input.selectedStyle.name,
      amountRm: roundRm(input.selectedStyle.price + travelFeeRm),
    });
  }

  for (const addOn of input.selectedAddOns) {
    lineItems.push({
      label: addOn.name,
      amountRm: roundRm(addOn.price),
    });
  }

  const totalRm = lineItems.reduce((sum, item) => sum + item.amountRm, 0);
  const depositRm = roundRm(
    input.chargeBy === "style"
      ? (input.selectedStyle?.deposit ?? 0)
      : (input.selectedPackage?.deposit ?? 0)
  );
  const cappedDepositRm = Math.min(depositRm, totalRm);
  const balanceRm = Math.max(totalRm - cappedDepositRm, 0);

  return {
    lineItems,
    totalRm,
    depositRm: cappedDepositRm,
    balanceRm,
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
    selectedPackage: { name: packageId, price: 0, deposit: 0 },
    selectedStyle: null,
    selectedAddOns: addOnIds.map((id) => ({ name: id, price: 0 })),
  });
}
