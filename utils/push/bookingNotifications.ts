import type { Booking, PersistedBooking } from "@/schemas/bookingSchema";
import { formatRm } from "@/utils/booking/pricing";
import { sendPushToUser } from "@/utils/push/webPush";

function formatSessionSummary(booking: Booking): string {
  const first = booking.sessions[0];
  if (!first) return booking.packageNames;

  const date = new Date(first.date);
  const dateLabel = date.toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = first.time_slot?.startTime;
  return time
    ? `${booking.packageNames} · ${dateLabel} ${time}`
    : `${booking.packageNames} · ${dateLabel}`;
}

function bookingDetailsUrl(booking: PersistedBooking) {
  return `/dashboard/bookings/${encodeURIComponent(String(booking._id))}`;
}

function isFullPayment(booking: Booking) {
  return booking.paymentOption === "full" || booking.invoice.balanceRm <= 0;
}

export async function notifyNewClientBooking(booking: PersistedBooking) {
  if (!booking.freelancerUserId) return;

  const isEnquiry = booking.status === "enquiry";
  const awaitingVerification =
    booking.paymentChannel === "manual_transfer" &&
    booking.depositVerificationStatus === "pending";
  const paymentLabel = isFullPayment(booking) ? "Full payment" : "Deposit";
  const verifyNote = awaitingVerification
    ? ` · ${paymentLabel} ${formatRm(booking.invoice.depositRm)} to verify`
    : "";

  await sendPushToUser(booking.freelancerUserId, {
    title: isEnquiry
      ? "New enquiry"
      : awaitingVerification
        ? "New booking — payment pending"
        : "New booking",
    body: `${booking.contact.name} — ${formatSessionSummary(booking)}${verifyNote}`,
    url: bookingDetailsUrl(booking),
  });
}

export async function notifyBookingConfirmed(booking: PersistedBooking) {
  if (!booking.freelancerUserId) return;

  const paymentLabel = isFullPayment(booking)
    ? "Full payment received"
    : "Deposit received";
  const balanceNote =
    !isFullPayment(booking) && booking.invoice.balanceRm > 0
      ? ` · ${formatRm(booking.invoice.balanceRm)} balance due`
      : "";

  await sendPushToUser(booking.freelancerUserId, {
    title: `${paymentLabel} — ${formatRm(booking.invoice.depositRm)}`,
    body: `${booking.contact.name} — ${formatSessionSummary(booking)}${balanceNote}`,
    url: bookingDetailsUrl(booking),
  });
}

export async function notifyBalancePaymentReceived(
  booking: PersistedBooking,
  amountRm: number
) {
  if (!booking.freelancerUserId) return;

  await sendPushToUser(booking.freelancerUserId, {
    title: `Balance payment received — ${formatRm(amountRm)}`,
    body: `${booking.contact.name} — ${formatSessionSummary(booking)} · Fully paid`,
    url: bookingDetailsUrl(booking),
  });
}

export async function notifyUpcomingSession(
  booking: PersistedBooking,
  sessionName: string,
  startLabel: string
) {
  if (!booking.freelancerUserId) return;

  await sendPushToUser(booking.freelancerUserId, {
    title: "Upcoming session",
    body: `${booking.contact.name} — ${sessionName} at ${startLabel}`,
    url: "/dashboard/bookings",
  });
}

export function getSessionStartDate(session: Booking["sessions"][number]): Date {
  const start = new Date(session.date);
  const [hours, minutes] = (session.time_slot?.startTime ?? "00:00")
    .split(":")
    .map((part) => Number(part));
  start.setHours(
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0
  );
  return start;
}

export function sessionReminderKey(session: Booking["sessions"][number]): string {
  const start = getSessionStartDate(session);
  return `${start.toISOString()}|${session.order}|${session.name}`;
}
