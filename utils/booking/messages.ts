import type { AddOnsSelection, BookingContact, BookingSession } from "@/schemas/booking";
import type { PublicBooking } from "@/schemas/booking-record";
import { formatLocationAddress, formatSessionSummary, getPackageLabel, getStyleLabel } from "@/utils/booking/utils";
import type { BookingPackageId, BookingStyleId } from "@/utils/booking/constants";
import { formatRm, type BookingInvoiceSummary } from "@/utils/booking/pricing";

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

type BuildBookingMessageInput = {
  freelancerName: string;
  contact: BookingContact;
  packageId: BookingPackageId;
  styleId: BookingStyleId;
  sessions: BookingSession[];
  addOns: AddOnsSelection;
  invoice: BookingInvoiceSummary;
  intent: "booking" | "enquiry";
};

function formatAddOnsSummary(addOns: AddOnsSelection) {
  if (addOns === "skipped") return "None";
  if (addOns === "not-sure") return "Not sure yet";
  return addOns
    .map((id) => id.replace("-", " "))
    .join(", ");
}

export function buildBookingMessage({
  freelancerName,
  contact,
  packageId,
  styleId,
  sessions,
  addOns,
  invoice,
  intent,
}: BuildBookingMessageInput) {
  const intro =
    intent === "booking"
      ? `Hi ${freelancerName}, I'd like to book now.`
      : `Hi ${freelancerName}, I have an enquiry about my booking.`;

  const sessionLines = sessions
    .map((session) => `• ${formatSessionSummary(session)}`)
    .join("\n");

  return [
    intro,
    "",
    `Name: ${contact.name}`,
    `Phone: ${contact.phone}`,
    `Email: ${contact.email}`,
    "",
    `Package: ${getPackageLabel(packageId)}`,
    `Style: ${getStyleLabel(styleId)}`,
    `Add-ons: ${formatAddOnsSummary(addOns)}`,
    "",
    "Sessions:",
    sessionLines,
    "",
    `Total: ${formatRm(invoice.totalRm)}`,
    `Deposit: ${formatRm(invoice.depositRm)}`,
    `Balance: ${formatRm(invoice.balanceRm)}`,
  ].join("\n");
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
  booking: PublicBooking & { _id: string }
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

  return [
    formatBookingStatusIntro(freelancerName, booking.status),
    "",
    `Booking ref: ${booking._id}`,
    `Name: ${booking.contact.name}`,
    `Phone: ${booking.contact.phone}`,
    `Email: ${booking.contact.email}`,
    "",
    `Package: ${getPackageLabel(booking.packageId)}`,
    `Style: ${getStyleLabel(booking.style)}`,
    `Add-ons: ${formatAddOnsSummary(booking.addOns)}`,
    "",
    "Sessions:",
    sessionLines,
    "",
    `Total: ${formatRm(booking.invoice.totalRm)}`,
    `Deposit: ${formatRm(booking.invoice.depositRm)}`,
    `Balance: ${formatRm(booking.invoice.balanceRm)}`,
  ].join("\n");
}
