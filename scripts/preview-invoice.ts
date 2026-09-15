/**
 * Generate a sample booking invoice PDF for visual QA.
 *
 * Usage: npx tsx scripts/preview-invoice.ts
 * Opens/writes: tmp-invoice-preview.pdf in the project root.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

import type { PersistedBooking } from "@/schemas/bookingSchema";
import { generateBookingInvoicePdf } from "@/utils/invoice/generateBookingInvoicePdf";

async function main() {
  const booking = {
    _id: "67abc123def4567890123456",
    freelancerUsername: "aisha",
    freelancerUserId: "u1",
    contact: {
      name: "Siti Aminah",
      email: "siti@example.com",
      mobile: "123456789",
      country_code: "+60",
    },
    packageIds: ["p1"],
    packageNames: "Hijabstyling Shawl",
    addOnIds: [],
    sessions: [
      {
        status: "scheduled" as const,
        name: "Session 1",
        packageId: "p1",
        styleName: "Neat & clean style",
        order: 0,
        date: new Date("2026-08-23T00:00:00"),
        time_slot: { startTime: "07:00", endTime: "08:30" },
        location: {
          placeId: "x",
          formattedAddress: "KLCC, Kuala Lumpur",
          displayName: "KLCC",
          location: { lat: 3.1, lng: 101.7 },
        },
      },
    ],
    invoice: {
      lineItems: [
        { label: "Hijabstyling Shawl", amountRm: 160 },
        { label: "Hijabstyling Shawl", amountRm: 160 },
      ],
      totalRm: 320,
      depositRm: 50,
      balanceRm: 270,
    },
    paymentOption: "deposit" as const,
    status: "confirmed" as const,
  } satisfies PersistedBooking;

  const pdf = await generateBookingInvoicePdf({
    booking,
    freelancer: {
      username: "aisha",
      email: "aisha@bridalync.com",
      mobile: "987654321",
      country_code: "+60",
    },
    paymentSettings: { balance_due_before: 3 },
    issuedAt: new Date("2026-04-26T10:00:00"),
  });

  const outPath = resolve(process.cwd(), "tmp-invoice-preview.pdf");
  writeFileSync(outPath, pdf);
  console.log(`Wrote ${outPath} (${pdf.length} bytes)`);
  console.log("Open that file to preview the invoice.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
