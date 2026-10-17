import type { Booking, PersistedBooking } from "@/schemas/bookingSchema";
import { getMoodboardPrefix } from "@/utils/booking/clientInfo";
import {
  applyPaymentOption,
  getPlatformFeeForCharge,
  roundSen,
  toSen,
  type BookingQuotationSummary,
} from "@/utils/booking/pricing";

const CLIENT_EDITABLE_STATUSES = new Set<Booking["status"]>([
  "requested",
  "pending",
  "failed",
  "confirmed",
]);

export function bookingMatchesClient(
  booking: { freelancerUsername: string },
  client: string
) {
  return (
    booking.freelancerUsername.toLowerCase() === client.trim().toLowerCase()
  );
}

/** The client can still change details, move the date, or cancel. */
export function isClientEditable(booking: {
  status: Booking["status"];
  source?: Booking["source"];
}) {
  return (
    booking.source !== "google_calendar" &&
    CLIENT_EDITABLE_STATUSES.has(booking.status)
  );
}

/** A transfer receipt is with the stylist, so the total it was uploaded for must stay put. */
export function isReceiptAwaitingReview(booking: {
  depositVerificationStatus?: Booking["depositVerificationStatus"];
  balanceVerificationStatus?: Booking["balanceVerificationStatus"];
}) {
  return (
    booking.depositVerificationStatus === "pending" ||
    booking.balanceVerificationStatus === "pending"
  );
}

type CollectedBooking = {
  status: Booking["status"];
  paymentOption?: Booking["paymentOption"];
  collectedRm?: number;
  platformFeeCollectedRm?: number;
  invoice: {
    totalRm: number;
    depositRm: number;
    balanceRm: number;
    breakdown?: BookingQuotationSummary["breakdown"];
  };
};

/** Ringgit already paid. Stored after a paid date change; otherwise derived from the invoice. */
export function getCollectedRm(booking: CollectedBooking): number {
  if (typeof booking.collectedRm === "number") {
    return roundSen(booking.collectedRm);
  }
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return 0;
  }
  if (booking.paymentOption === "full") {
    return roundSen(booking.invoice.totalRm);
  }
  return roundSen(booking.invoice.depositRm);
}

/** Platform fee already collected on those payments. */
export function getPlatformFeeCollectedRm(booking: CollectedBooking): number {
  if (typeof booking.platformFeeCollectedRm === "number") {
    return roundSen(booking.platformFeeCollectedRm);
  }
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return 0;
  }
  const platformFeeRm = booking.invoice.breakdown?.platformFeeRm ?? 0;
  if (platformFeeRm <= 0) return 0;
  if (booking.paymentOption === "full" || booking.invoice.balanceRm <= 0) {
    return roundSen(platformFeeRm);
  }
  const depositShare = booking.invoice.breakdown?.depositPlatformFeeRm;
  if (depositShare != null) return roundSen(depositShare);
  if (booking.invoice.totalRm <= 0) return 0;
  return roundSen(
    (platformFeeRm * Math.min(booking.invoice.depositRm, booking.invoice.totalRm)) /
      booking.invoice.totalRm
  );
}

/**
 * Keeps what the client already paid. A higher total becomes a balance;
 * a lower total is not refunded.
 */
export function applyCollectedToInvoice(
  invoice: BookingQuotationSummary,
  collectedRm: number,
  platformFeeCollectedRm: number
): { invoice: BookingQuotationSummary; paymentOption: "deposit" | "full" } {
  const paid = roundSen(collectedRm);
  const totalRm = roundSen(invoice.totalRm);
  const dueRm = roundSen(Math.max(0, totalRm - paid));
  const depositRm = roundSen(totalRm - dueRm);
  const newPlatformFeeRm = invoice.breakdown?.platformFeeRm ?? 0;
  const keptFeeRm = Math.min(
    roundSen(platformFeeCollectedRm),
    roundSen(newPlatformFeeRm)
  );

  return {
    paymentOption: dueRm > 0 ? "deposit" : "full",
    invoice: {
      ...invoice,
      totalRm,
      depositRm,
      balanceRm: dueRm,
      ...(invoice.breakdown
        ? {
            breakdown: {
              ...invoice.breakdown,
              depositPlatformFeeRm: keptFeeRm,
            },
          }
        : {}),
    },
  };
}

export function retainedRm(collected: number, totalRm: number) {
  return roundSen(Math.max(0, collected - totalRm));
}

/** Moodboard files already stored for this booking. */
export function isBookingMoodboardUrl(
  url: string,
  freelancerUserId: string,
  bookingId: string
) {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    return path.includes(getMoodboardPrefix(freelancerUserId, bookingId));
  } catch {
    return false;
  }
}

/** Sen Stripe should have charged for this booking's current deposit, full total, or balance. */
export function expectedChargeSen(
  booking: Pick<PersistedBooking, "invoice">,
  purpose: "deposit" | "balance" | "full"
) {
  const rm =
    purpose === "balance"
      ? booking.invoice.balanceRm
      : purpose === "full"
        ? applyPaymentOption(booking.invoice, "full").totalRm
        : booking.invoice.depositRm;
  return toSen(rm);
}

export function chargeAmountMatches(
  expectedSen: number,
  amountSen: number | null | undefined
) {
  return typeof amountSen === "number" && amountSen === expectedSen;
}

/** Fee taken on a balance (or difference) charge, added to `platformFeeCollectedRm` once it is paid. */
export function platformFeeOnBalanceCharge(booking: CollectedBooking) {
  return getPlatformFeeForCharge(
    booking.invoice,
    "balance",
    booking.invoice.balanceRm
  );
}
