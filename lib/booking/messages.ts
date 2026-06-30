import type { AddOnsSelection, BookingContact, BookingSession } from "@/lib/schemas/booking";
import { formatSessionSummary, getPackageLabel, getStyleLabel } from "@/lib/booking/utils";
import type { BookingPackageId, BookingStyleId } from "@/lib/booking/constants";
import { formatRm, type BookingInvoiceSummary } from "@/lib/booking/pricing";

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
