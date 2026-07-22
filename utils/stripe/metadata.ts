import type { PersistedBooking } from "@/schemas/bookingSchema";

export type BookingCheckoutPurpose = "deposit" | "full" | "balance";

export type BookingCheckoutMetadata = {
  type: string;
  platform: string;
  bookingId: string;
  freelancerUsername: string;
  packageId: string;
  packageName: string;
  clientName: string;
  clientEmail: string;
  paymentOption: string;
  depositRm: string;
  totalRm: string;
  balanceRm: string;
};

export function buildBookingCheckoutMetadata(input: {
  booking: PersistedBooking;
  freelancerUsername: string;
  purpose?: BookingCheckoutPurpose;
}): BookingCheckoutMetadata {
  const bookingId = String(input.booking._id);
  const paymentOption =
    input.booking.paymentOption ??
    (input.booking.invoice.balanceRm === 0 ? "full" : "deposit");

  const type =
    input.purpose === "balance"
      ? "booking_balance"
      : paymentOption === "full"
        ? "booking_full_payment"
        : "booking_deposit";

  return {
    type,
    platform: "bridalync",
    bookingId,
    freelancerUsername: input.freelancerUsername,
    packageId: input.booking.packageId,
    packageName: input.booking.packageName,
    clientName: input.booking.contact.name,
    clientEmail: input.booking.contact.email,
    paymentOption: input.purpose === "balance" ? "balance" : paymentOption,
    depositRm: String(input.booking.invoice.depositRm),
    totalRm: String(input.booking.invoice.totalRm),
    balanceRm: String(input.booking.invoice.balanceRm),
  };
}

export function getBookingIdFromMetadata(
  metadata?: Record<string, string> | null
) {
  return metadata?.bookingId ?? null;
}

export function isBookingBalancePayment(
  metadata?: Record<string, string> | null
) {
  return metadata?.type === "booking_balance";
}

export function isBookingInitialPayment(
  metadata?: Record<string, string> | null
) {
  return (
    metadata?.type === "booking_deposit" ||
    metadata?.type === "booking_full_payment"
  );
}
