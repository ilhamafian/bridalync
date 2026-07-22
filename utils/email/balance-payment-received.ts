import type { PersistedBooking } from "@/schemas/bookingSchema";
import { getAppUrl } from "@/utils/appUrl";
import { formatRm } from "@/utils/booking/pricing";
import { sendEmail } from "@/utils/email/resend";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendBalancePaymentReceivedEmail(
  booking: PersistedBooking,
  freelancerName?: string | null
) {
  const email = booking.contact.email?.trim();
  if (!email) {
    console.warn(
      "[booking-email] Skipping balance received email — booking has no client email"
    );
    return;
  }

  const appUrl = getAppUrl();
  const bookingUrl = `${appUrl}/${booking.freelancerUsername}/bookings/${String(booking._id)}?payment=success`;
  const displayName = freelancerName?.trim() || booking.freelancerUsername;
  const bookingRef = String(booking._id);

  const text = [
    `Hi ${booking.contact.name},`,
    "",
    `We've received your remaining balance payment. Your booking with ${displayName} is fully paid.`,
    "",
    `Booking ref: ${bookingRef}`,
    `Package: ${booking.packageName}`,
    `Total paid: ${formatRm(booking.invoice.totalRm)}`,
    "",
    `View your booking: ${bookingUrl}`,
    "",
    "— Bridalync",
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111; max-width: 560px;">
      <p>Hi ${escapeHtml(booking.contact.name)},</p>
      <p>We've received your remaining balance payment. Your booking with <strong>${escapeHtml(displayName)}</strong> is fully paid.</p>
      <p style="margin: 24px 0 8px; font-size: 14px; color: #666;">Booking ref</p>
      <p style="margin: 0 0 16px; font-family: monospace;">${escapeHtml(bookingRef)}</p>
      <p style="margin: 0 0 4px;"><strong>Package:</strong> ${escapeHtml(booking.packageName)}</p>
      <p style="margin: 0 0 24px;"><strong>Total paid:</strong> ${escapeHtml(formatRm(booking.invoice.totalRm))}</p>
      <p>
        <a href="${escapeHtml(bookingUrl)}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px;">
          View your booking
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">— Bridalync</p>
    </div>
  `.trim();

  await sendEmail({
    to: email,
    subject: `Balance paid — ${booking.packageName}`,
    html,
    text,
  });

  if (process.env.DEV_MODE === "true") {
    console.log(
      `[booking-email] Sent balance received email to ${email} for booking ${bookingRef}`
    );
  }
}
