import type { PublicBooking } from "@/schemas/bookingRecord";
import { formatLocationAddress, formatSessionSummary } from "@/utils/session";
import { formatRm } from "@/utils/booking/pricing";

export function toWhatsAppNumber(countryCode: string, mobile: string) {
  const normalizedCountryCode = countryCode.replace(/\D/g, "");
  const normalizedMobile = mobile.replace(/\D/g, "").replace(/^0+/, "");
  return `${normalizedCountryCode}${normalizedMobile}`;
}

export function buildWhatsAppUrl(
  countryCode: string,
  mobile: string,
  message: string
) {
  const phone = toWhatsAppNumber(countryCode, mobile);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatClientPhone(contact: PublicBooking["contact"]) {
  if (contact.mobile) {
    const prefix = contact.country_code ? `${contact.country_code} ` : "";
    return `${prefix}${contact.mobile}`.trim();
  }
  return "Not provided";
}

function formatBookingStatusIntro(
  freelancerName: string,
  status: PublicBooking["status"]
) {
  switch (status) {
    case "confirmed":
      return `Hi ${freelancerName}, my booking is confirmed.`;
    case "failed":
      return `Hi ${freelancerName}, I had trouble completing my booking payment.`;
    case "pending":
      return `Hi ${freelancerName}, I have a pending booking.`;
    case "enquiry":
      return `Hi ${freelancerName}, I have an enquiry about my booking.`;
  }
}

export function buildBookingResultMessage(
  freelancerName: string,
  booking: PublicBooking
) {
  const sessionLines = booking.sessions
    .map((session) => {
      const line = `• ${formatSessionSummary(session)}`;
      if (session.location) {
        return `${line}\n  Location: ${formatLocationAddress(session.location)}`;
      }
      return line;
    })
    .join("\n");

  const addOnSummary =
    booking.addOnIds.length > 0 ? booking.addOnIds.join(", ") : "None";

  return [
    formatBookingStatusIntro(freelancerName, booking.status),
    "",
    `Booking ref: ${booking._id}`,
    `Name: ${booking.contact.name}`,
    `Phone: ${formatClientPhone(booking.contact)}`,
    `Email: ${booking.contact.email}`,
    "",
    `Package: ${booking.packageName}`,
    ...(booking.styleName ? [`Style: ${booking.styleName}`] : []),
    `Add-ons: ${addOnSummary}`,
    "",
    "Sessions:",
    sessionLines,
    "",
    `Total: ${formatRm(booking.invoice.totalRm)}`,
    `Deposit: ${formatRm(booking.invoice.depositRm)}`,
    `Balance: ${formatRm(booking.invoice.balanceRm)}`,
  ].join("\n");
}
