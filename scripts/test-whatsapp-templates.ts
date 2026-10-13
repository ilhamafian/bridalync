/**
 * Sends the booking WhatsApp templates to a test number with sample data, using the same code the app uses.
 *
 *   npx tsx --env-file=.env scripts/test-whatsapp-templates.ts <countryCode> <mobile> [template...]
 *   npx tsx --env-file=.env scripts/test-whatsapp-templates.ts 60 123456789 booking_accepted
 *
 * Templates: payment_reminder, booking_accepted, booking_rejected (default: all three).
 */
import type { PersistedBooking } from "@/schemas/bookingSchema";
import {
  sendBookingAcceptedWhatsApp,
  sendBookingRejectedWhatsApp,
  sendPaymentReminderWhatsApp,
} from "@/utils/whatsapp/bookingTemplates";

const [countryCode, mobile, ...requested] = process.argv.slice(2);
if (!countryCode || !mobile) {
  console.error(
    "Usage: npx tsx --env-file=.env scripts/test-whatsapp-templates.ts <countryCode> <mobile> [template...]"
  );
  process.exit(1);
}

const freelancerName = "Test Stylist";
const booking = {
  _id: "000000000000000000000000",
  freelancerUsername: process.env.TEST_FREELANCER_USERNAME || "test",
  packageNames: "Nikah & Sanding",
  contact: {
    name: "Test Client",
    email: "test@example.com",
    country_code: countryCode,
    mobile,
  },
  sessions: [{ date: new Date("2026-08-20T00:00:00+08:00") }],
  invoice: { balanceRm: 150, depositRm: 100, totalRm: 250 },
} as unknown as PersistedBooking;

const senders: Record<string, () => Promise<void>> = {
  payment_reminder: () => sendPaymentReminderWhatsApp({ booking, freelancerName }),
  booking_accepted: () => sendBookingAcceptedWhatsApp(booking, freelancerName),
  booking_rejected: () => sendBookingRejectedWhatsApp(booking, freelancerName),
};

async function main() {
  const templates = requested.length > 0 ? requested : Object.keys(senders);
  let failed = 0;
  for (const template of templates) {
    const send = senders[template];
    if (!send) {
      console.error(`Unknown template: ${template}`);
      failed += 1;
      continue;
    }
    try {
      await send();
      console.log(`OK   ${template}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${template}:`, error instanceof Error ? error.message : error);
    }
  }
  process.exit(failed > 0 ? 1 : 0);
}

void main();
