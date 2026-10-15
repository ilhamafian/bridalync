import type { SerializedBooking } from "@/utils/booking/serializeBooking";

/** QR / bank-transfer receipt uploaded, waiting for the stylist to approve the deposit or full payment. */
export function isDepositVerificationPending(booking: SerializedBooking) {
  return (
    booking.depositVerificationStatus === "pending" &&
    booking.status === "pending"
  );
}

/** Balance receipt uploaded, waiting for the stylist to approve it. */
export function isBalanceVerificationPending(booking: SerializedBooking) {
  return booking.balanceVerificationStatus === "pending";
}

export function needsPaymentVerification(booking: SerializedBooking) {
  return (
    isDepositVerificationPending(booking) ||
    isBalanceVerificationPending(booking)
  );
}

export type PendingPaymentKind = "deposit" | "full" | "balance";

export function pendingPaymentKind(
  booking: SerializedBooking
): PendingPaymentKind | null {
  if (isDepositVerificationPending(booking)) {
    return booking.paymentOption === "full" ||
      booking.requestPaymentOption === "full"
      ? "full"
      : "deposit";
  }
  if (isBalanceVerificationPending(booking)) return "balance";
  return null;
}

export function pendingPaymentAmountRm(booking: SerializedBooking): number | null {
  const kind = pendingPaymentKind(booking);
  if (kind === "full") return booking.invoice.totalRm;
  if (kind === "deposit") return booking.invoice.depositRm;
  if (kind === "balance") return booking.invoice.balanceRm;
  return null;
}

export function pendingPaymentLabel(kind: PendingPaymentKind) {
  switch (kind) {
    case "deposit":
      return "Deposit";
    case "full":
      return "Full payment";
    case "balance":
      return "Balance";
  }
}

export function pendingPaymentStatusLabel(kind: PendingPaymentKind) {
  switch (kind) {
    case "deposit":
      return "Review deposit";
    case "full":
      return "Review payment";
    case "balance":
      return "Review balance";
  }
}
