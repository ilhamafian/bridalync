import type { PersistedBooking } from "@/schemas/bookingSchema";
import { getAppUrl } from "@/utils/appUrl";
import { formatRm } from "@/utils/booking/pricing";
import { sendEmail } from "@/utils/email/resend";
import { formatLocationAddress, formatSessionSummary } from "@/utils/session";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSessionLines(booking: PersistedBooking) {
  return booking.sessions.map((session) => {
    const summary = formatSessionSummary(session);
    if (!session.location) return summary;
    return `${summary}\n  Location: ${formatLocationAddress(session.location)}`;
  });
}

function duePhrasing(daysUntil: number) {
  if (daysUntil <= 0) return "due today";
  if (daysUntil === 1) return "due tomorrow";
  return `due in ${daysUntil} days`;
}

export async function sendBalanceDueReminderEmail(input: {
  booking: PersistedBooking;
  freelancerName?: string | null;
  daysUntilSession: number;
  balanceDueBeforeDays: number;
}) {
  const { booking, daysUntilSession, balanceDueBeforeDays } = input;
  const email = booking.contact.email?.trim();
  if (!email) {
    console.warn(
      "[booking-email] Skipping balance reminder — booking has no client email"
    );
    return;
  }

  const appUrl = getAppUrl();
  const bookingUrl = `${appUrl}/${booking.freelancerUsername}/bookings/${String(booking._id)}`;
  const displayName =
    input.freelancerName?.trim() || booking.freelancerUsername;
  const bookingRef = String(booking._id);
  const sessionLines = buildSessionLines(booking);
  const dueLabel = duePhrasing(daysUntilSession);

  const text = [
    `Hi ${booking.contact.name},`,
    "",
    `This is a reminder that the remaining balance for your booking with ${displayName} is ${dueLabel}.`,
    "",
    `Balance due: ${formatRm(booking.invoice.balanceRm)}`,
    `Total: ${formatRm(booking.invoice.totalRm)}`,
    `Deposit already paid: ${formatRm(booking.invoice.depositRm)}`,
    "",
    `Booking ref: ${bookingRef}`,
    `Package: ${booking.packageName}`,
    ...(booking.styleName ? [`Style: ${booking.styleName}`] : []),
    "",
    "Sessions:",
    ...sessionLines.map((line) => `• ${line}`),
    "",
    `Pay your balance here: ${bookingUrl}`,
    "",
    `Balances are due ${balanceDueBeforeDays} day${balanceDueBeforeDays === 1 ? "" : "s"} before your session.`,
    "",
    "— Bridalync",
  ].join("\n");

  const sessionHtml = sessionLines
    .map((line) => {
      const [summary, ...rest] = line.split("\n");
      const location = rest.join(" ").replace(/^Location:\s*/, "");
      return `
        <li style="margin-bottom: 8px;">
          <div>${escapeHtml(summary)}</div>
          ${
            location
              ? `<div style="color: #666; font-size: 14px;">${escapeHtml(location)}</div>`
              : ""
          }
        </li>
      `;
    })
    .join("");

  const html = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111; max-width: 560px;">
      <p>Hi ${escapeHtml(booking.contact.name)},</p>
      <p>This is a reminder that the remaining balance for your booking with <strong>${escapeHtml(displayName)}</strong> is <strong>${escapeHtml(dueLabel)}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 4px 0;">Balance due</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600;">${escapeHtml(formatRm(booking.invoice.balanceRm))}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Deposit paid</td>
          <td style="padding: 4px 0; text-align: right;">${escapeHtml(formatRm(booking.invoice.depositRm))}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Total</td>
          <td style="padding: 4px 0; text-align: right;">${escapeHtml(formatRm(booking.invoice.totalRm))}</td>
        </tr>
      </table>
      <p style="margin: 24px 0 8px; font-size: 14px; color: #666;">Booking ref</p>
      <p style="margin: 0 0 16px; font-family: monospace;">${escapeHtml(bookingRef)}</p>
      <p style="margin: 0 0 4px;"><strong>Package:</strong> ${escapeHtml(booking.packageName)}</p>
      ${
        booking.styleName
          ? `<p style="margin: 0 0 16px;"><strong>Style:</strong> ${escapeHtml(booking.styleName)}</p>`
          : `<p style="margin: 0 0 16px;"></p>`
      }
      <p style="margin: 0 0 8px;"><strong>Sessions</strong></p>
      <ul style="padding-left: 18px; margin: 0 0 20px;">
        ${sessionHtml}
      </ul>
      <p>
        <a href="${escapeHtml(bookingUrl)}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px;">
          Pay remaining balance
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Balances are due ${balanceDueBeforeDays} day${balanceDueBeforeDays === 1 ? "" : "s"} before your session.
      </p>
      <p style="color: #666; font-size: 14px;">— Bridalync</p>
    </div>
  `.trim();

  await sendEmail({
    to: email,
    subject: `Balance ${dueLabel} — ${booking.packageName}`,
    html,
    text,
  });

  if (process.env.DEV_MODE === "true") {
    console.log(
      `[booking-email] Sent balance reminder to ${email} for booking ${bookingRef}`
    );
  }
}
