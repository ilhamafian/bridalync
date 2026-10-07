import type { PersistedBooking } from "@/schemas/bookingSchema";
import { getAppUrl } from "@/utils/appUrl";
import { formatRm, resolveRequestPaymentOption } from "@/utils/booking/pricing";
import { sendEmail } from "@/utils/email/resend";
import { formatSessionSummary } from "@/utils/session";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bookingUrl(booking: PersistedBooking) {
  return `${getAppUrl()}/${booking.freelancerUsername}/bookings/${String(booking._id)}`;
}

function sessionLines(booking: PersistedBooking) {
  return booking.sessions.map((session) => formatSessionSummary(session));
}

export async function sendBookingRequestApprovedEmail(
  booking: PersistedBooking,
  freelancerName: string | null | undefined,
  balanceDueBeforeDays: number
) {
  const email = booking.contact.email?.trim();
  if (!email) return;

  const url = bookingUrl(booking);
  const displayName = freelancerName?.trim() || booking.freelancerUsername;
  const canPayDeposit =
    resolveRequestPaymentOption(
      booking.invoice,
      booking.sessions,
      balanceDueBeforeDays,
      "deposit"
    ) === "deposit";
  const amountLabel = canPayDeposit
    ? `Pay a deposit of ${formatRm(booking.invoice.depositRm)} or the full ${formatRm(booking.invoice.totalRm)}`
    : `Full payment: ${formatRm(booking.invoice.totalRm)}`;
  const sessions = sessionLines(booking);

  const text = [
    `Hi ${booking.contact.name},`,
    "",
    `Good news — ${displayName} approved your booking request. Pay now to confirm your booking.`,
    "",
    `Event: ${booking.packageNames}`,
    ...sessions.map((line) => `• ${line}`),
    amountLabel,
    "",
    `Pay and confirm: ${url}`,
    "",
    "— Bridalync",
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111; max-width: 560px;">
      <p>Hi ${escapeHtml(booking.contact.name)},</p>
      <p>Good news — <strong>${escapeHtml(displayName)}</strong> approved your booking request. Pay now to confirm your booking.</p>
      <p style="margin: 16px 0 4px;"><strong>Event:</strong> ${escapeHtml(booking.packageNames)}</p>
      <ul style="margin: 0 0 8px; padding-left: 20px;">
        ${sessions.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
      </ul>
      <p style="margin: 0 0 24px;"><strong>${escapeHtml(amountLabel)}</strong></p>
      <p>
        <a href="${escapeHtml(url)}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px;">
          Pay and confirm
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">— Bridalync</p>
    </div>
  `.trim();

  await sendEmail({
    to: email,
    subject: `Booking request approved — ${booking.packageNames}`,
    html,
    text,
  });
}

export async function sendBookingRequestDeclinedEmail(
  booking: PersistedBooking,
  freelancerName?: string | null
) {
  const email = booking.contact.email?.trim();
  if (!email) return;

  const url = bookingUrl(booking);
  const displayName = freelancerName?.trim() || booking.freelancerUsername;
  const sessions = sessionLines(booking);

  const text = [
    `Hi ${booking.contact.name},`,
    "",
    `Sorry — ${displayName} can't take your booking request for ${booking.packageNames}. You haven't been charged.`,
    "",
    ...sessions.map((line) => `• ${line}`),
    "",
    `View your request: ${url}`,
    "",
    "— Bridalync",
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111; max-width: 560px;">
      <p>Hi ${escapeHtml(booking.contact.name)},</p>
      <p>Sorry — <strong>${escapeHtml(displayName)}</strong> can't take your booking request for <strong>${escapeHtml(booking.packageNames)}</strong>. You haven't been charged.</p>
      <ul style="margin: 0 0 24px; padding-left: 20px;">
        ${sessions.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
      </ul>
      <p><a href="${escapeHtml(url)}">View your request</a></p>
      <p style="color: #666; font-size: 14px;">— Bridalync</p>
    </div>
  `.trim();

  await sendEmail({
    to: email,
    subject: `Booking request declined — ${booking.packageNames}`,
    html,
    text,
  });
}
