import type { Booking, PersistedBooking } from "@/schemas/bookingSchema";
import { sendPushToUser } from "@/utils/push/webPush";

function formatSessionSummary(booking: Booking): string {
  const first = booking.sessions[0];
  if (!first) return booking.packageName;

  const date = new Date(first.date);
  const dateLabel = date.toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = first.time_slot?.startTime;
  return time
    ? `${booking.packageName} · ${dateLabel} ${time}`
    : `${booking.packageName} · ${dateLabel}`;
}

export async function notifyNewClientBooking(booking: PersistedBooking) {
  if (!booking.freelancerUserId) return;

  const isEnquiry = booking.status === "enquiry";
  await sendPushToUser(booking.freelancerUserId, {
    title: isEnquiry ? "New enquiry" : "New booking",
    body: `${booking.contact.name} — ${formatSessionSummary(booking)}`,
    url: "/dashboard/bookings",
  });
}

export async function notifyBookingConfirmed(booking: PersistedBooking) {
  if (!booking.freelancerUserId) return;

  await sendPushToUser(booking.freelancerUserId, {
    title: "Booking confirmed",
    body: `${booking.contact.name} paid — ${formatSessionSummary(booking)}`,
    url: "/dashboard/bookings",
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
