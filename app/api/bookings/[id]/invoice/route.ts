import { NextRequest } from "next/server";

import { SettingModel } from "@/models/Setting";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { getBookingById } from "@/utils/bookings";
import {
  bookingInvoiceFilename,
  generateBookingInvoicePdf,
} from "@/utils/invoice/generateBookingInvoicePdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const userId =
      user && isOnboardingComplete(user.onboarding)
        ? toIdString(user._id)
        : null;
    if (!user || !userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const booking = await getBookingById(id);
    if (!booking || booking.freelancerUserId !== userId) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    if (booking.status !== "confirmed" && booking.status !== "completed") {
      return createResponse(
        { error: "Invoices are only available for paid bookings." },
        409
      );
    }

    const settings = await new SettingModel().findSettingsByUserId(userId);
    const pdf = await generateBookingInvoicePdf({
      booking,
      freelancer: {
        username: user.username?.trim() || booking.freelancerUsername,
        email: user.email ?? null,
        mobile: user.mobile ?? null,
        country_code: user.country_code ?? null,
      },
      invoiceSettings: settings?.invoice ?? null,
      paymentSettings: settings?.payment ?? null,
      issuedAt:
        booking.balancePaidAt ??
        booking.depositPaidAt ??
        booking.created_at ??
        new Date(),
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${bookingInvoiceFilename(booking)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
