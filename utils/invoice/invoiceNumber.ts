export function invoiceNumberFromBookingId(bookingId: string): string {
  const hex = bookingId.replace(/[^a-f0-9]/gi, "").slice(-6);
  if (!hex) return "0001";
  const numeric = Number.parseInt(hex, 16) % 1_000_000;
  return String(numeric).padStart(4, "0");
}
