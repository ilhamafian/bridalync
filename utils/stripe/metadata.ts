import type { PersistedBooking } from "@/schemas/bookingSchema";

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
}): BookingCheckoutMetadata {
  const bookingId = String(input.booking._id);
  const paymentOption =
    input.booking.paymentOption ??
    (input.booking.invoice.balanceRm === 0 ? "full" : "deposit");

  return {
    type: paymentOption === "full" ? "booking_full_payment" : "booking_deposit",
    platform: "bridalync",
    bookingId,
    freelancerUsername: input.freelancerUsername,
    packageId: input.booking.packageId,
    packageName: input.booking.packageName,
    clientName: input.booking.contact.name,
    clientEmail: input.booking.contact.email,
    paymentOption,
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
