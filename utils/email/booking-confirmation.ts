import type { PersistedBooking } from "@/schemas/bookingSchema";
import type { InvoiceSetting, PaymentSetting } from "@/schemas/settingSchema";
import { getAppUrl } from "@/utils/appUrl";
import { formatRm } from "@/utils/booking/pricing";
import { sendEmail } from "@/utils/email/resend";
import {
  bookingInvoiceFilename,
  generateBookingInvoicePdf,
  type InvoiceFreelancer,
} from "@/utils/invoice/generateBookingInvoicePdf";
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
    const styleLine = session.styleName
      ? `\n  Style: ${session.styleName}`
      : "";
    if (!session.location) return `${summary}${styleLine}`;
    return `${summary}${styleLine}\n  Location: ${formatLocationAddress(session.location)}`;
  });
}

function amountPaidRm(booking: PersistedBooking) {
  if (
    booking.paymentOption === "full" ||
    booking.invoice.balanceRm === 0
  ) {
    return booking.invoice.totalRm;
  }
  return booking.invoice.depositRm;
}

function buildBookingConfirmationEmail(input: {
  booking: PersistedBooking;
  freelancerName: string;
  bookingUrl: string;
}) {
  const { booking, freelancerName, bookingUrl } = input;
  const paidRm = amountPaidRm(booking);
  const isFullPayment =
    booking.paymentOption === "full" || booking.invoice.balanceRm === 0;
  const sessionLines = buildSessionLines(booking);
  const bookingRef = String(booking._id);

  const text = [
    `Hi ${booking.contact.name},`,
    "",
    `Your payment was successful. Your booking with ${freelancerName} is confirmed.`,
    "",
    `Booking ref: ${bookingRef}`,
    `Packages: ${booking.packageNames}`,
    "",
    "Sessions:",
    ...sessionLines.map((line) => `• ${line}`),
    "",
    `Amount paid: ${formatRm(paidRm)}${isFullPayment ? " (full payment)" : " (deposit)"}`,
    `Total: ${formatRm(booking.invoice.totalRm)}`,
    ...(!isFullPayment
      ? [`Balance due: ${formatRm(booking.invoice.balanceRm)}`]
      : []),
    "",
    `View your booking: ${bookingUrl}`,
    "",
    "Your invoice is attached to this email as a PDF.",
    "",
    "If you have any questions, reply to this email or contact your stylist directly.",
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
      <p>Your payment was successful. Your booking with <strong>${escapeHtml(freelancerName)}</strong> is confirmed.</p>
      <p style="margin: 24px 0 8px; font-size: 14px; color: #666;">Booking ref</p>
      <p style="margin: 0 0 16px; font-family: monospace;">${escapeHtml(bookingRef)}</p>
      <p style="margin: 0 0 16px;"><strong>Packages:</strong> ${escapeHtml(booking.packageNames)}</p>
      <p style="margin: 0 0 8px;"><strong>Sessions</strong></p>
      <ul style="padding-left: 18px; margin: 0 0 20px;">
        ${sessionHtml}
      </ul>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 4px 0;">Amount paid</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600;">
            ${escapeHtml(formatRm(paidRm))}${isFullPayment ? " (full)" : " (deposit)"}
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Total</td>
          <td style="padding: 4px 0; text-align: right;">${escapeHtml(formatRm(booking.invoice.totalRm))}</td>
        </tr>
        ${
          !isFullPayment
            ? `<tr>
          <td style="padding: 4px 0;">Balance due</td>
          <td style="padding: 4px 0; text-align: right;">${escapeHtml(formatRm(booking.invoice.balanceRm))}</td>
        </tr>`
            : ""
        }
      </table>
      <p>
        <a href="${escapeHtml(bookingUrl)}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px;">
          View your booking
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">Your invoice is attached to this email as a PDF.</p>
      <p style="color: #666; font-size: 14px;">If you have any questions, contact your stylist directly.</p>
      <p style="color: #666; font-size: 14px;">— Bridalync</p>
    </div>
  `.trim();

  return { text, html };
}

export async function sendBookingPaymentConfirmationEmail(
  booking: PersistedBooking,
  options?: {
    freelancerName?: string | null;
    freelancer?: InvoiceFreelancer | null;
    invoiceSettings?: Pick<InvoiceSetting, "company_registration_number"> | null;
    paymentSettings?: Pick<PaymentSetting, "balance_due_before"> | null;
  }
) {
  const email = booking.contact.email?.trim();
  if (!email) {
    console.warn(
      "[booking-email] Skipping confirmation email — booking has no client email"
    );
    return;
  }

  const appUrl = getAppUrl();
  const bookingUrl = `${appUrl}/${booking.freelancerUsername}/bookings/${String(booking._id)}?payment=success`;
  const displayName =
    options?.freelancerName?.trim() || booking.freelancerUsername;

  const { text, html } = buildBookingConfirmationEmail({
    booking,
    freelancerName: displayName,
    bookingUrl,
  });

  const freelancer: InvoiceFreelancer = options?.freelancer ?? {
    username: booking.freelancerUsername,
  };

  let attachments:
    | Array<{ filename: string; content: Buffer; contentType: string }>
    | undefined;

  try {
    const pdf = await generateBookingInvoicePdf({
      booking,
      freelancer,
      invoiceSettings: options?.invoiceSettings,
      paymentSettings: options?.paymentSettings,
    });
    attachments = [
      {
        filename: bookingInvoiceFilename(booking),
        content: pdf,
        contentType: "application/pdf",
      },
    ];
  } catch (error) {
    console.error(
      "[booking-email] Failed to generate invoice PDF — sending confirmation without attachment:",
      error
    );
  }

  await sendEmail({
    to: email,
    subject: `Booking confirmed — ${booking.packageNames}`,
    html,
    text,
    attachments,
  });

  if (process.env.DEV_MODE === "true") {
    console.log(
      `[booking-email] Sent payment confirmation to ${email} for booking ${String(booking._id)}${attachments ? " (with invoice PDF)" : ""}`
    );
  }
}
