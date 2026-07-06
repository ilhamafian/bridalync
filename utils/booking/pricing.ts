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

export function formatRm(amount: number) {
  return `RM${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
      amountRm: input.selectedPackage.price + travelFeeRm,
    });
  }

  if (input.chargeBy === "style" && input.selectedStyle) {
    lineItems.push({
      label: input.selectedStyle.name,
      amountRm: input.selectedStyle.price + travelFeeRm,
    });
  }

  for (const addOn of input.selectedAddOns) {
    lineItems.push({
      label: addOn.name,
      amountRm: addOn.price,
    });
  }

  const totalRm = lineItems.reduce((sum, item) => sum + item.amountRm, 0);
  const depositRm = input.selectedPackage?.deposit ?? 0;
  const balanceRm = Math.max(totalRm - depositRm, 0);

  return {
    lineItems,
    totalRm,
    depositRm,
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
