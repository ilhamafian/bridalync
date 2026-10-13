import type { PersistedBooking } from "@/schemas/bookingSchema";
import { toDateKey } from "@/utils/booking/availability";
import { formatRm, getEarliestSessionDate } from "@/utils/booking/pricing";
import { sendWhatsAppTemplate } from "@/utils/whatsapp/sendTemplate";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function ordinal(day: number) {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** Earliest session date as "20th August 2026" in the booking timezone. */
export function formatBookingDate(date: Date | string) {
  const key = toDateKey(date);
  if (!key) return "the scheduled date";
  const [year, month, day] = key.split("-").map(Number);
  const monthName = MONTHS[month - 1];
  if (!monthName || !day || !year) return "the scheduled date";
  return `${ordinal(day)} ${monthName} ${year}`;
}

function clientName(booking: PersistedBooking) {
  return booking.contact.name.trim() || "there";
}

function freelancerDisplayName(
  booking: PersistedBooking,
  name?: string | null
) {
  return name?.trim() || booking.freelancerUsername;
}

function eventName(booking: PersistedBooking) {
  return booking.packageNames.trim() || "your booking";
}

function bookingDate(booking: PersistedBooking) {
  const earliest = getEarliestSessionDate(booking.sessions);
  return earliest ? formatBookingDate(earliest) : "the scheduled date";
}

function paymentPath(booking: PersistedBooking) {
  return `${booking.freelancerUsername}/bookings/${String(booking._id)}`;
}

function clientPhone(booking: PersistedBooking) {
  return {
    countryCode: booking.contact.country_code,
    mobile: booking.contact.mobile,
  };
}

export async function sendPaymentReminderWhatsApp(input: {
  booking: PersistedBooking;
  freelancerName?: string | null;
}) {
  const name = freelancerDisplayName(input.booking, input.freelancerName);
  await sendWhatsAppTemplate({
    ...clientPhone(input.booking),
    template: "payment_reminder",
    body: [clientName(input.booking), formatRm(input.booking.invoice.balanceRm), name, name],
    urlButton: { index: 0, text: paymentPath(input.booking) },
  });
}

export async function sendBookingAcceptedWhatsApp(
  booking: PersistedBooking,
  freelancerName?: string | null
) {
  const name = freelancerDisplayName(booking, freelancerName);
  await sendWhatsAppTemplate({
    ...clientPhone(booking),
    template: "booking_accepted",
    body: [clientName(booking), name, eventName(booking), bookingDate(booking), name],
    urlButton: { index: 0, text: paymentPath(booking) },
  });
}

export async function sendBookingRejectedWhatsApp(
  booking: PersistedBooking,
  freelancerName?: string | null
) {
  const name = freelancerDisplayName(booking, freelancerName);
  await sendWhatsAppTemplate({
    ...clientPhone(booking),
    template: "booking_rejected",
    language: "en_US",
    body: [clientName(booking), name, bookingDate(booking), eventName(booking), name],
  });
}
