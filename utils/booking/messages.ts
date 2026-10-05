import type { PublicBooking } from "@/schemas/bookingSchema";
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

export const REVIEW_REQUEST_PLACEHOLDERS = [
  { token: "{first_name}", description: "Client's first name" },
  { token: "{client_name}", description: "Client's full name" },
  { token: "{business_name}", description: "Your name" },
  { token: "{review_link}", description: "Review page link" },
] as const;

export const REVIEW_LINK_PLACEHOLDER = "{review_link}";

export const DEFAULT_REVIEW_REQUEST_TEMPLATE = [
  "Hi {first_name}, thank you so much for hiring me on your big day!",
  "",
  "Kalau ada masa, boleh tak share review kat sini:",
  REVIEW_LINK_PLACEHOLDER,
].join("\n");

export const REVIEW_REQUEST_TEMPLATE_MAX_LENGTH = 1000;

/** Blank template = default. The review link is appended when the template omits it. */
export function buildReviewRequestMessage(input: {
  clientName: string;
  freelancerName: string;
  reviewUrl: string;
  template?: string | null;
}) {
  const template = input.template?.trim() || DEFAULT_REVIEW_REQUEST_TEMPLATE;
  const withLink = template.includes(REVIEW_LINK_PLACEHOLDER)
    ? template
    : `${template}\n\n${REVIEW_LINK_PLACEHOLDER}`;
  const clientName = input.clientName.trim();
  const values: Record<string, string> = {
    "{first_name}": clientName.split(/\s+/)[0] || "there",
    "{client_name}": clientName || "there",
    "{business_name}": input.freelancerName,
    [REVIEW_LINK_PLACEHOLDER]: input.reviewUrl,
  };
  return withLink.replace(
    /\{(first_name|client_name|business_name|review_link)\}/g,
    (token) => values[token] ?? token
  );
}

export function buildBalanceReminderMessage(input: {
  clientName: string;
  balanceRm: number;
  sessionDate: string;
  bookingUrl: string | null;
}) {
  const firstName = input.clientName.trim().split(/\s+/)[0] || "there";
  const date = new Date(input.sessionDate).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return [
    `Hi ${firstName}, just a friendly reminder that your balance of ${formatRm(input.balanceRm)} for your session on ${date} is still outstanding.`,
    ...(input.bookingUrl
      ? ["", "You can view your booking and pay the balance here:", input.bookingUrl]
      : []),
    "",
    "Thank you!",
  ].join("\n");
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
    case "completed":
      return `Hi ${freelancerName}, my booking is completed.`;
    case "failed":
      return `Hi ${freelancerName}, I had trouble completing my booking payment.`;
    case "pending":
      return `Hi ${freelancerName}, I have a pending booking.`;
    case "enquiry":
      return `Hi ${freelancerName}, I have an enquiry about my booking.`;
    case "cancelled":
      return `Hi ${freelancerName}, my booking was cancelled.`;
  }
}

export function buildBookingResultMessage(
  freelancerName: string,
  booking: PublicBooking
) {
  const sessionLines = booking.sessions
    .map((session) => {
      const line = `• ${formatSessionSummary(session)}`;
      const styleLine = session.styleName
        ? `\n  Style: ${session.styleName}`
        : "";
      if (session.location) {
        return `${line}${styleLine}\n  Location: ${formatLocationAddress(session.location)}`;
      }
      return `${line}${styleLine}`;
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
    `Packages: ${booking.packageNames}`,
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
