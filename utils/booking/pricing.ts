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
  /** Style extra charges already included in `amountRm`; only the stylist's dashboard lists them. */
  styleExtras?: QuotationLineItem[];
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
  /** Part of `platformFeeRm` collected with the deposit charge; the balance charge takes the rest. */
  depositPlatformFeeRm?: number;
  /**
   * Stripe's fixed fee on the second (balance) charge, grossed up, when paying deposit + balance.
   * Included in the first session and `processingFeeRm`; dropped when the client pays in full.
   */
  splitPaymentFeeRm?: number;
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

/** Appends ` × N` when more than one person shares the priced item. */
export function paxLineItemLabel(name: string, pax: number) {
  return pax > 1 ? `${name} × ${pax}` : name;
}

/**
 * Scales event/style prices and deposits by headcount. Morning call and other
 * attached fields are left alone (charged once for the shared session).
 */
export function applyPaxToPricedItems<
  T extends { name: string; price: number; deposit?: number },
>(items: T[], pax: number): T[] {
  if (pax <= 1) return items;
  return items.map((item) => ({
    ...item,
    name: paxLineItemLabel(item.name, pax),
    price: item.price * pax,
    ...(typeof item.deposit === "number"
      ? { deposit: item.deposit * pax }
      : {}),
  }));
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
  /** Charging by event: styles picked with an extra charge; folded into the event price, not in the deposit. */
  selectedStyleExtras?: QuotationLineItemInput[];
  selectedAddOns: QuotationLineItemInput[];
  travel?: TravelQuotationInput;
};

/** Round money to whole ringgit. */
export function roundRm(amount: number) {
  return Math.round(amount);
}

/** Smallest currency unit. Stripe charges and fees are in sen. */
export function toSen(amountRm: number) {
  return Math.round(amountRm * 100);
}

/** Round money to the nearest sen. */
export function roundSen(amountRm: number) {
  return toSen(amountRm) / 100;
}

/** Round money up to the next whole ringgit. An exact ringgit amount stays unchanged. */
export function ceilRm(amountRm: number) {
  const sen = toSen(amountRm);
  if (sen <= 0) return sen / 100;
  const remainder = sen % 100;
  if (remainder === 0) return sen / 100;
  return (sen + (100 - remainder)) / 100;
}

/** Splits `amountRm` into `count` whole-ringgit shares; leftover ringgit go to the first shares. */
export function splitEvenlyRm(amountRm: number, count: number): number[] {
  if (count <= 0) return [];
  const total = roundRm(amountRm);
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** Splits `amountRm` into `count` sen shares; leftover sen go to the first shares. */
function splitEvenlySen(amountRm: number, count: number): number[] {
  if (count <= 0) return [];
  const total = toSen(amountRm);
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) =>
    (base + (index < remainder ? 1 : 0)) / 100
  );
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
/**
 * Bridalync's platform fee is off during beta. Set this to true to charge
 * `PLATFORM_FEE_PERCENT` again. Stripe's processing fee is unchanged.
 */
export const PLATFORM_FEE_ENABLED = false;
export const PAYMENT_PROCESSING_FEE_PERCENT = 3;
export const PAYMENT_PROCESSING_FEE_FIXED_RM = 1;

/** Bridalync's platform fee on a price: 3% rounded up. Callers skip this while `PLATFORM_FEE_ENABLED` is false. */
export function calculatePlatformFeeRm(amountRm: number) {
  const rounded = roundRm(amountRm);
  if (rounded <= 0) return 0;
  return Math.ceil((rounded * PLATFORM_FEE_PERCENT) / 100);
}

/** Stripe's percentage fee on a charge, in sen, rounded to the nearest sen (half up). */
function stripePercentFeeSen(chargeSen: number) {
  return Math.round((chargeSen * PAYMENT_PROCESSING_FEE_PERCENT) / 100);
}

/**
 * Smallest charge, in sen, that still leaves `afterPercentFeeSen` after Stripe's
 * percentage fee. The percentage applies to the full charge, so the fee has to be
 * grossed up; rounding to the nearest sen can move the charge by a sen or two.
 */
function chargeSenCovering(afterPercentFeeSen: number) {
  if (afterPercentFeeSen <= 0) return 0;
  const keptPercent = 100 - PAYMENT_PROCESSING_FEE_PERCENT;
  let chargeSen = Math.ceil((afterPercentFeeSen * 100) / keptPercent);
  const kept = (charge: number) => charge - stripePercentFeeSen(charge);
  while (kept(chargeSen) < afterPercentFeeSen) chargeSen += 1;
  while (chargeSen > 0 && kept(chargeSen - 1) >= afterPercentFeeSen) chargeSen -= 1;
  return chargeSen;
}

/**
 * Exact fee, in sen, added so a payment-gateway price still leaves the stylist
 * her amount after Stripe. The platform fee (3% rounded up to the next ringgit)
 * is taken as the Stripe application fee. Stripe then charges 3% of the full
 * charge, to the nearest sen, plus RM1 once per charge. This stays in sen so a
 * quotation can split it across items; `withClientFeesRm` and the deposit and
 * balance charges round the amount the client pays up to the next ringgit.
 * `includeFixed` = false for amounts added on top of another item, which already
 * carries the RM1. `platformFee` follows `PLATFORM_FEE_ENABLED` unless a booking
 * already priced with the fee passes true.
 */
export function calculateClientFeesRm(
  amountRm: number,
  includeFixed = true,
  platformFee = PLATFORM_FEE_ENABLED
) {
  const rounded = roundRm(amountRm);
  if (rounded <= 0) return 0;
  const platformRm = platformFee ? calculatePlatformFeeRm(rounded) : 0;
  return roundSen(grossChargeRm(rounded + platformRm, includeFixed) - rounded);
}

/** One Stripe charge that leaves `netRm` (stylist's share + application fee) after Stripe's fee. */
function grossChargeRm(netRm: number, includeFixed = true) {
  return (
    chargeSenCovering(
      toSen(netRm) + (includeFixed ? toSen(PAYMENT_PROCESSING_FEE_FIXED_RM) : 0)
    ) / 100
  );
}

/** What the client sees for a price once the fees are added, rounded up to the next ringgit. */
export function withClientFeesRm(
  amountRm: number,
  includeFixed = true,
  platformFee = PLATFORM_FEE_ENABLED
) {
  return ceilRm(
    roundRm(amountRm) + calculateClientFeesRm(amountRm, includeFixed, platformFee)
  );
}

/**
 * Adds the fees into a quotation's prices (no separate line): each item gets its
 * percentage share, the first session the RM1 plus the round-up to the next ringgit.
 * Priced for deposit + balance (two Stripe charges, each grossed up and rounded up
 * to the next ringgit) when there's a deposit; `applyPaymentOption(..., "full")`
 * drops the second charge's fee. Apply before any discount.
 */
export function applyPaymentProcessingFee(
  quotation: BookingQuotationSummary,
  { platformFee = PLATFORM_FEE_ENABLED }: { platformFee?: boolean } = {}
): BookingQuotationSummary {
  if (quotation.totalRm <= 0) return quotation;
  const platformFeeRm = platformFee ? calculatePlatformFeeRm(quotation.totalRm) : 0;
  const fullTotalRm = withClientFeesRm(quotation.totalRm, true, platformFee);
  const splitsPayment =
    quotation.depositRm > 0 && quotation.depositRm < quotation.totalRm;

  let totalRm = fullTotalRm;
  let depositRm = quotation.depositRm > 0 ? fullTotalRm : 0;
  let depositPlatformFeeRm = 0;
  let splitPaymentFeeRm = 0;
  if (splitsPayment) {
    depositPlatformFeeRm = platformFee
      ? Math.min(calculatePlatformFeeRm(quotation.depositRm), platformFeeRm)
      : 0;
    depositRm = ceilRm(
      grossChargeRm(roundRm(quotation.depositRm) + depositPlatformFeeRm)
    );
    const balanceChargeRm = ceilRm(
      grossChargeRm(
        quotation.totalRm - roundRm(quotation.depositRm) + platformFeeRm - depositPlatformFeeRm
      )
    );
    totalRm = roundSen(depositRm + balanceChargeRm);
    splitPaymentFeeRm = roundSen(totalRm - fullTotalRm);
  }

  const feeRm = roundSen(totalRm - quotation.totalRm);
  const feeBreakdown = {
    processingFeeRm: feeRm,
    ...(platformFeeRm > 0 ? { platformFeeRm } : {}),
    ...(splitsPayment && platformFeeRm > 0 ? { depositPlatformFeeRm } : {}),
    ...(splitPaymentFeeRm !== 0 ? { splitPaymentFeeRm } : {}),
  };
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
      lineItems: first
        ? [{ ...first, amountRm: roundSen(first.amountRm + feeRm) }, ...rest]
        : [],
      totalRm,
      depositRm,
      balanceRm: roundSen(totalRm - depositRm),
      ...(breakdown ? { breakdown: { ...breakdown, ...feeBreakdown } } : {}),
    };
  }

  const sessions = breakdown.sessions.map((item) => ({
    ...item,
    amountRm: roundSen(item.amountRm + share(item.amountRm)),
    ...(item.morningCallRm
      ? { morningCallRm: roundSen(item.morningCallRm + share(item.morningCallRm)) }
      : {}),
    ...(item.styleExtras
      ? {
          styleExtras: item.styleExtras.map((extra) => ({
            ...extra,
            amountRm: roundSen(extra.amountRm + share(extra.amountRm)),
          })),
        }
      : {}),
  }));
  const addOns = breakdown.addOns.map((item) => ({
    ...item,
    amountRm: roundSen(item.amountRm + share(item.amountRm)),
  }));
  const travelFeeRm = roundSen(breakdown.travelFeeRm + share(breakdown.travelFeeRm));
  const assignedSen =
    [...sessions, ...addOns].reduce((sum, item) => sum + toSen(item.amountRm), 0) +
    toSen(travelFeeRm) -
    toSen(quotation.totalRm);
  sessions[0] = {
    ...sessions[0],
    amountRm: roundSen(sessions[0].amountRm + feeRm - assignedSen / 100),
  };
  const travelShares = splitEvenlySen(travelFeeRm, sessions.length);

  return {
    lineItems: [
      ...sessions.map((item, index) => ({
        label: item.label,
        amountRm: roundSen(item.amountRm + travelShares[index]),
      })),
      ...addOns.map(({ label, amountRm }) => ({ label, amountRm })),
    ],
    totalRm,
    depositRm,
    balanceRm: roundSen(totalRm - depositRm),
    breakdown: { ...breakdown, sessions, addOns, travelFeeRm, ...feeBreakdown },
  };
}

export function formatRm(amount: number) {
  const sen = toSen(amount);
  const sign = sen < 0 ? "-" : "";
  const abs = Math.abs(sen);
  const ringgit = Math.trunc(abs / 100);
  const cents = abs % 100;
  return `${sign}RM${ringgit.toLocaleString("en-MY")}.${String(cents).padStart(2, "0")}`;
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
  if (paymentOption !== "full") return quotation;
  const splitFeeRm = quotation.breakdown?.splitPaymentFeeRm ?? 0;
  if (!quotation.breakdown || splitFeeRm === 0) {
    return {
      ...quotation,
      depositRm: quotation.totalRm,
      balanceRm: 0,
    };
  }

  // One charge instead of deposit + balance: the second charge's fee no longer applies.
  const {
    splitPaymentFeeRm: _splitFee,
    depositPlatformFeeRm: _depositPlatformFee,
    ...breakdown
  } = quotation.breakdown;
  const totalRm = roundSen(quotation.totalRm - splitFeeRm);
  const [firstItem, ...restItems] = quotation.lineItems;
  const [firstSession, ...restSessions] = breakdown.sessions;
  return {
    lineItems: firstItem
      ? [{ ...firstItem, amountRm: roundSen(firstItem.amountRm - splitFeeRm) }, ...restItems]
      : [],
    totalRm,
    depositRm: totalRm,
    balanceRm: 0,
    breakdown: {
      ...breakdown,
      sessions: firstSession
        ? [
            { ...firstSession, amountRm: roundSen(firstSession.amountRm - splitFeeRm) },
            ...restSessions,
          ]
        : [],
      ...(breakdown.processingFeeRm !== undefined
        ? { processingFeeRm: roundSen(breakdown.processingFeeRm - splitFeeRm) }
        : {}),
    },
  };
}

/** Lowers the total to `totalRm`, recording the difference as a discount. */
export function applyDiscountedTotal(
  quotation: BookingQuotationSummary,
  totalRm: number
): BookingQuotationSummary {
  const discountedTotalRm = roundSen(totalRm);
  if (toSen(discountedTotalRm) > toSen(quotation.totalRm)) {
    throw new Error(
      `Total can't be more than the full price of ${formatRm(quotation.totalRm)}.`
    );
  }
  const discountRm = roundSen(quotation.totalRm - discountedTotalRm);
  if (discountRm <= 0) return quotation;

  const depositRm = Math.min(quotation.depositRm, discountedTotalRm);
  const platformFeeRm = quotation.breakdown?.platformFeeRm;
  const discountedPlatformFeeRm = platformFeeRm
    ? roundRm((platformFeeRm * discountedTotalRm) / quotation.totalRm)
    : 0;
  const depositPlatformFeeRm = quotation.breakdown?.depositPlatformFeeRm;
  return {
    lineItems: [
      ...quotation.lineItems,
      { label: "Discount", amountRm: -discountRm },
    ],
    totalRm: discountedTotalRm,
    depositRm,
    balanceRm: roundSen(discountedTotalRm - depositRm),
    ...(quotation.breakdown
      ? {
          breakdown: {
            ...quotation.breakdown,
            discountRm,
            ...(platformFeeRm ? { platformFeeRm: discountedPlatformFeeRm } : {}),
            ...(depositPlatformFeeRm !== undefined
              ? {
                  depositPlatformFeeRm: Math.min(
                    depositPlatformFeeRm,
                    discountedPlatformFeeRm
                  ),
                }
              : {}),
          },
        }
      : {}),
  };
}

/**
 * Platform fee to collect on one Stripe charge: the deposit takes the part its price
 * was grossed up for (older bookings: its share by amount), the balance the rest, a
 * full payment all of it.
 */
export function getPlatformFeeForCharge(
  invoice: Pick<BookingQuotationSummary, "totalRm" | "depositRm" | "breakdown">,
  purpose: "deposit" | "balance" | "full",
  chargeRm: number
): number {
  const platformFeeRm = invoice.breakdown?.platformFeeRm ?? 0;
  if (platformFeeRm <= 0 || invoice.totalRm <= 0 || chargeRm <= 0) return 0;
  const depositShareRm =
    invoice.breakdown?.depositPlatformFeeRm ??
    roundRm(
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
  const styleExtras =
    input.chargeBy === "package"
      ? (input.selectedStyleExtras ?? []).map((extra) => ({
          label: extra.name,
          amountRm: roundRm(extra.price),
        }))
      : [];
  const styleExtrasRm = styleExtras.reduce((sum, extra) => sum + extra.amountRm, 0);

  priced.forEach((item, index) => {
    const slotCount = Math.max(1, item.slotCount ?? 1);
    const label = sessionLineItemLabel(item.name, slotCount);
    const morningCallRm = roundRm(item.morningCall?.amountRm ?? 0);
    const itemStyleExtras = index === 0 ? styleExtras : [];
    const price =
      item.price * slotCount +
      morningCallRm +
      regionShares[index] +
      (index === 0 ? styleExtrasRm : 0);
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
      ...(itemStyleExtras.length > 0 ? { styleExtras: itemStyleExtras } : {}),
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
