type PayableBooking = {
  status: string;
  paymentOption?: "deposit" | "full";
  invoice: { balanceRm: number };
  requestApprovedAt?: Date | string;
  paymentLinkAt?: Date | string;
};

/**
 * Approved requests and dashboard bookings sent a payment link: the client pays (deposit or full) from the booking
 * page, and a failed/expired payment or rejected receipt keeps them payable.
 */
export function awaitsClientPayment(booking: PayableBooking): boolean {
  return (
    booking.status === "pending" &&
    Boolean(booking.requestApprovedAt || booking.paymentLinkAt)
  );
}

export function hasPayableBalance(booking: PayableBooking): boolean {
  return (
    booking.status === "confirmed" &&
    booking.paymentOption === "deposit" &&
    booking.invoice.balanceRm > 0
  );
}

/** The client booking page, where they pay. */
export function buildBookingPaymentUrl(
  appUrl: string,
  username: string,
  bookingId: string
) {
  return `${appUrl.replace(/\/$/, "")}/${username}/bookings/${encodeURIComponent(bookingId)}`;
}
