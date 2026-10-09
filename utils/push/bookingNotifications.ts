import { SettingModel } from "@/models/Setting";
import type { Booking, PersistedBooking } from "@/schemas/bookingSchema";
import type { RegionId } from "@/schemas/settingSchema";
import { formatRm } from "@/utils/booking/pricing";
import { getRegionLabel } from "@/utils/booking/regions";
import { sendPushToUser } from "@/utils/push/webPush";

/** States of the booking's active sessions that the stylist blocks travel days for. */
async function getTravelDayRegions(
  booking: PersistedBooking
): Promise<RegionId[]> {
  if (!booking.freelancerUserId) return [];
  const settings = await new SettingModel().findSettingsByUserId(
    booking.freelancerUserId
  );
  const bufferRegions = settings?.travel.travel_buffer_regions ?? [];
  if (bufferRegions.length === 0) return [];

  const regions = new Set<RegionId>();
  for (const session of booking.sessions) {
    if (session.status === "cancelled" || !session.region) continue;
    if (bufferRegions.includes(session.region)) regions.add(session.region);
  }
  return [...regions];
}

async function formatTravelDaysNote(
  booking: PersistedBooking,
  blocked: boolean
): Promise<string> {
  const regions = await getTravelDayRegions(booking);
  if (regions.length === 0) return "";
  const states = regions.map(getRegionLabel).join(", ");
  return blocked
    ? ` · Out of state (${states}): travel days blocked`
    : ` · Out of state (${states}): travel days block once approved`;
}

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
  const travelNote = isEnquiry
    ? ""
    : await formatTravelDaysNote(booking, booking.status !== "requested");

  await sendPushToUser(booking.freelancerUserId, {
    title: isEnquiry
      ? "New enquiry"
      : booking.status === "requested"
        ? "New booking request — approve or decline"
        : awaitingVerification
        ? "New booking — payment pending"
        : "New booking",
    body: `${booking.contact.name} — ${formatSessionSummary(booking)}${verifyNote}${travelNote}`,
    url: bookingDetailsUrl(booking),
  });
}

/** A client uploaded a transfer receipt for an approved booking request. */
export async function notifyDepositReceiptSubmitted(
  booking: PersistedBooking,
  amountRm: number,
  paysInFull: boolean
) {
  if (!booking.freelancerUserId) return;

  const paymentLabel = paysInFull ? "Full payment" : "Deposit";
  await sendPushToUser(booking.freelancerUserId, {
    title: "Payment receipt to verify",
    body: `${booking.contact.name} — ${formatSessionSummary(booking)} · ${paymentLabel} ${formatRm(amountRm)}`,
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
  const travelNote = await formatTravelDaysNote(booking, true);

  await sendPushToUser(booking.freelancerUserId, {
    title: `${paymentLabel} — ${formatRm(booking.invoice.depositRm)}`,
    body: `${booking.contact.name} — ${formatSessionSummary(booking)}${balanceNote}${travelNote}`,
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

export type SessionReminderLead = "1d" | "2d";

export async function notifyUpcomingSession(
  booking: PersistedBooking,
  sessionName: string,
  startLabel: string,
  lead: SessionReminderLead = "1d"
) {
  if (!booking.freelancerUserId) return;

  await sendPushToUser(booking.freelancerUserId, {
    title: lead === "2d" ? "Session in 2 days" : "Upcoming session",
    body: `${booking.contact.name} — ${sessionName} at ${startLabel}`,
    url: bookingDetailsUrl(booking),
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

/** The 1-day key has no suffix so reminders recorded before the 2-day one existed still match. */
export function sessionReminderKey(
  session: Booking["sessions"][number],
  lead: SessionReminderLead = "1d"
): string {
  const start = getSessionStartDate(session);
  const key = `${start.toISOString()}|${session.order}|${session.name}`;
  return lead === "2d" ? `${key}|2d` : key;
}
