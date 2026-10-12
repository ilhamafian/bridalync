import type { SessionForm } from "@/schemas/sessionSchema";
import type { TimeSlot } from "@/schemas/settingSchema";

import { calculateTravelFeeRm } from "@/utils/booking/travel";

export type QuotationLineItem = {
  label: string;
  amountRm: number;
};

export type BreakdownSessionItem = QuotationLineItem & {
  sessionKey?: string;
  /** Morning call charge already included in `amountRm`; the invoice lists it separately. */
  morningCallRm?: number;
  /** Sessions the morning call charge covers. */
  morningCallCount?: number;
};

export type BookingQuotationBreakdown = {
  sessions: BreakdownSessionItem[];
  addOns: QuotationLineItem[];
  travelFeeRm: number;
  discountRm?: number;
  /** Fees already included in the amounts above (payment-gateway bookings), incl. `platformFeeRm`. */
  processingFeeRm?: number;
  /** Bridalync's platform fee within `processingFeeRm`; collected as the Stripe application fee. */
  platformFeeRm?: number;
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
  /** Added on top of the price; not part of the deposit. */
  morningCall?: { count: number; amountRm: number };
};

export function sessionLineItemLabel(name: string, slotCount = 1) {
  return slotCount > 1 ? `${name} × ${slotCount} slots` : name;
}

export type TravelQuotationInput =
  | DistanceTravelQuotationInput
  /** Fixed region fee, split evenly across the priced items (no separate travel fee). */
  | { kind: "region"; feeRm: number };

export type DistanceTravelQuotationInput = {
  kind?: "distance";
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
  /** Charging by event: styles picked with an extra charge; listed like add-ons, not in the deposit. */
  selectedStyleExtras?: QuotationLineItemInput[];
  selectedAddOns: QuotationLineItemInput[];
  travel?: TravelQuotationInput;
};

/** Round money to whole ringgit; `formatRm` still shows `.00`. */
export function roundRm(amount: number) {
  return Math.round(amount);
}

/** Splits `amountRm` into `count` whole-ringgit shares; leftover ringgit go to the first shares. */
export function splitEvenlyRm(amountRm: number, count: number): number[] {
  if (count <= 0) return [];
  const total = roundRm(amountRm);
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** Deposit in RM for an item charged at `priceRm`; percent deposits are a share of that price. */
export function resolveDepositRm(
  deposit: number | undefined,
  depositType: "fixed" | "percent" | undefined,
  priceRm: number
): number {
  const value = deposit ?? 0;
  if (depositType === "percent") {
    return roundRm((Math.max(0, priceRm) * Math.min(100, Math.max(0, value))) / 100);
  }
  return value;
}

export function formatDeposit(
  deposit: number | undefined,
  depositType: "fixed" | "percent" | undefined
): string | null {
  if (deposit == null) return null;
  return depositType === "percent" ? `${deposit}%` : formatRm(deposit);
}

export const PLATFORM_FEE_PERCENT = 3;
export const PAYMENT_PROCESSING_FEE_PERCENT = 3;
export const PAYMENT_PROCESSING_FEE_FIXED_RM = 1;

/** Bridalync's platform fee on a price: 3% rounded up. */
export function calculatePlatformFeeRm(amountRm: number) {
  const rounded = roundRm(amountRm);
  if (rounded <= 0) return 0;
  return Math.ceil((rounded * PLATFORM_FEE_PERCENT) / 100);
}

/**
 * Fees added to the client's price for payment-gateway stylists: the platform fee,
 * then the payment processing fee on top of it (3% rounded up + RM1 once per booking).
 * `includeFixed` = false for amounts added on top of another item, which already
 * carries the RM1. `platformFee` = false for bookings priced before the platform fee.
 */
export function calculateClientFeesRm(
  amountRm: number,
  includeFixed = true,
  platformFee = true
) {
  const rounded = roundRm(amountRm);
  if (rounded <= 0) return 0;
  const platformRm = platformFee ? calculatePlatformFeeRm(rounded) : 0;
  return (
    platformRm +
    Math.ceil(((rounded + platformRm) * PAYMENT_PROCESSING_FEE_PERCENT) / 100) +
    (includeFixed ? PAYMENT_PROCESSING_FEE_FIXED_RM : 0)
  );
}

/** What the client sees for a price once the fees are added. */
export function withClientFeesRm(
  amountRm: number,
  includeFixed = true,
  platformFee = true
) {
  return roundRm(amountRm) + calculateClientFeesRm(amountRm, includeFixed, platformFee);
}

/**
 * Adds the fees into a quotation's prices (no separate line): each item gets its
 * percentage share, the first session the RM1 plus rounding, so the total is
 * `withClientFeesRm(totalRm)`. Apply before any discount.
 */
export function applyPaymentProcessingFee(
  quotation: BookingQuotationSummary,
  { platformFee = true }: { platformFee?: boolean } = {}
): BookingQuotationSummary {
  if (quotation.totalRm <= 0) return quotation;
  const feeRm = calculateClientFeesRm(quotation.totalRm, true, platformFee);
  const platformFeeRm = platformFee ? calculatePlatformFeeRm(quotation.totalRm) : 0;
  const feeBreakdown = {
    processingFeeRm: feeRm,
    ...(platformFeeRm > 0 ? { platformFeeRm } : {}),
  };
  const totalRm = quotation.totalRm + feeRm;
  const depositRm =
    quotation.depositRm > 0
      ? Math.min(withClientFeesRm(quotation.depositRm, true, platformFee), totalRm)
      : 0;
  const share = (amountRm: number) =>
    calculateClientFeesRm(amountRm, false, platformFee);

  const breakdown = quotation.breakdown;
  const hasItemisedShape =
    breakdown &&
    breakdown.sessions.length > 0 &&
    !breakdown.discountRm &&
    quotation.lineItems.length ===
      breakdown.sessions.length + breakdown.addOns.length;

  if (!breakdown || !hasItemisedShape) {
    const [first, ...rest] = quotation.lineItems;
    return {
      ...quotation,
      lineItems: first ? [{ ...first, amountRm: first.amountRm + feeRm }, ...rest] : [],
      totalRm,
      depositRm,
      balanceRm: totalRm - depositRm,
      ...(breakdown ? { breakdown: { ...breakdown, ...feeBreakdown } } : {}),
    };
  }

  const sessions = breakdown.sessions.map((item) => ({
    ...item,
    amountRm: item.amountRm + share(item.amountRm),
    ...(item.morningCallRm
      ? { morningCallRm: item.morningCallRm + share(item.morningCallRm) }
      : {}),
  }));
  const addOns = breakdown.addOns.map((item) => ({
    ...item,
    amountRm: item.amountRm + share(item.amountRm),
  }));
  const travelFeeRm = breakdown.travelFeeRm + share(breakdown.travelFeeRm);
  const assignedRm =
    [...sessions, ...addOns].reduce((sum, item) => sum + item.amountRm, 0) +
    travelFeeRm -
    quotation.totalRm;
  sessions[0] = { ...sessions[0], amountRm: sessions[0].amountRm + feeRm - assignedRm };
  const travelShares = splitEvenlyRm(travelFeeRm, sessions.length);

  return {
    lineItems: [
      ...sessions.map((item, index) => ({
        label: item.label,
        amountRm: item.amountRm + travelShares[index],
      })),
      ...addOns.map(({ label, amountRm }) => ({ label, amountRm })),
    ],
    totalRm,
    depositRm,
    balanceRm: totalRm - depositRm,
    breakdown: { ...breakdown, sessions, addOns, travelFeeRm, ...feeBreakdown },
  };
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

/**
 * Option an approved booking request is paid with: the client's pick, unless there's no deposit
 * to pay or the first session is within the balance-due window (then full).
 */
export function resolveRequestPaymentOption(
  invoice: Pick<BookingQuotationSummary, "depositRm" | "balanceRm">,
  sessions: Array<{ date: Date | string }>,
  balanceDueBeforeDays: number,
  requested: "deposit" | "full"
): "deposit" | "full" {
  if (
    requested === "full" ||
    invoice.depositRm <= 0 ||
    invoice.balanceRm <= 0 ||
    requiresFullPayment(sessions, balanceDueBeforeDays)
  ) {
    return "full";
  }
  return "deposit";
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
  const platformFeeRm = quotation.breakdown?.platformFeeRm;
  return {
    lineItems: [
      ...quotation.lineItems,
      { label: "Discount", amountRm: -discountRm },
    ],
    totalRm: discountedTotalRm,
    depositRm,
    balanceRm: discountedTotalRm - depositRm,
    ...(quotation.breakdown
      ? {
          breakdown: {
            ...quotation.breakdown,
            discountRm,
            ...(platformFeeRm
              ? {
                  platformFeeRm: roundRm(
                    (platformFeeRm * discountedTotalRm) / quotation.totalRm
                  ),
                }
              : {}),
          },
        }
      : {}),
  };
}

/**
 * Platform fee to collect on one Stripe charge: the deposit takes its share of the
 * booking's platform fee, the balance the rest, a full payment all of it.
 */
export function getPlatformFeeForCharge(
  invoice: Pick<BookingQuotationSummary, "totalRm" | "depositRm" | "breakdown">,
  purpose: "deposit" | "balance" | "full",
  chargeRm: number
): number {
  const platformFeeRm = invoice.breakdown?.platformFeeRm ?? 0;
  if (platformFeeRm <= 0 || invoice.totalRm <= 0 || chargeRm <= 0) return 0;
  const depositShareRm = roundRm(
    (platformFeeRm * Math.min(invoice.depositRm, invoice.totalRm)) / invoice.totalRm
  );
  const feeRm =
    purpose === "full"
      ? platformFeeRm
      : purpose === "deposit"
        ? depositShareRm
        : platformFeeRm - depositShareRm;
  return Math.max(0, Math.min(feeRm, chargeRm));
}

export function calculateBookingQuotation(
  input: CalculateQuotationInput
): BookingQuotationSummary {
  const lineItems: QuotationLineItem[] = [];
  const sessionPrices: BookingQuotationBreakdown["sessions"] = [];

  const travel = input.travel;
  const regionFeeRm = travel?.kind === "region" ? travel.feeRm : 0;
  const travelFeeRm =
    travel && travel.kind !== "region" && travel.enabled
      ? calculateTravelFeeRm({
          sessions: travel.sessions,
          timeSlots: travel.timeSlots,
          ratePerKm: travel.ratePerKm,
          longDistanceRatePerKm: travel.longDistanceRatePerKm,
          distanceKmBySessionKey: travel.distanceKmBySessionKey,
        })
      : 0;

  const priced =
    input.chargeBy === "package"
      ? input.selectedPackages
      : (input.selectedSessionStyles ?? []);

  const regionShares = splitEvenlyRm(regionFeeRm, priced.length);
  const travelShares = splitEvenlyRm(travelFeeRm, priced.length);

  priced.forEach((item, index) => {
    const slotCount = Math.max(1, item.slotCount ?? 1);
    const label = sessionLineItemLabel(item.name, slotCount);
    const morningCallRm = roundRm(item.morningCall?.amountRm ?? 0);
    const price = item.price * slotCount + morningCallRm + regionShares[index];
    lineItems.push({
      label,
      amountRm: roundRm(price + travelShares[index]),
    });
    sessionPrices.push({
      label,
      amountRm: roundRm(price),
      ...(item.sessionKey ? { sessionKey: item.sessionKey } : {}),
      ...(morningCallRm > 0 && item.morningCall
        ? { morningCallRm, morningCallCount: item.morningCall.count }
        : {}),
    });
  });

  const styleExtras =
    input.chargeBy === "package" ? (input.selectedStyleExtras ?? []) : [];
  const addOnPrices = [...styleExtras, ...input.selectedAddOns].map((addOn) => ({
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
