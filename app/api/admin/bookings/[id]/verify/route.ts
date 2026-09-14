import { NextRequest } from "next/server";
import { z } from "zod";

import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionAdmin } from "@/utils/auth/admin-session";
import {
  confirmBookingBalancePayment,
  confirmBookingPayment,
  getBookingById,
  rejectManualBalancePayment,
  rejectManualDepositPayment,
} from "@/utils/bookings";
import { serializeBooking } from "@/utils/booking/serializeBooking";

const verifyRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  type: z.enum(["deposit", "balance"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = verifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const booking = await getBookingById(id);
    if (!booking) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    const { action, type } = parsed.data;

    if (type === "deposit") {
      if (booking.depositVerificationStatus !== "pending") {
        return createResponse(
          { error: "No pending deposit verification for this booking." },
          409
        );
      }

      const updated =
        action === "approve"
          ? await confirmBookingPayment(id)
          : await rejectManualDepositPayment(id);

      return createResponse({
        booking: updated ? serializeBooking(updated) : null,
      });
    }

    if (booking.balanceVerificationStatus !== "pending") {
      return createResponse(
        { error: "No pending balance verification for this booking." },
        409
      );
    }

    const updated =
      action === "approve"
        ? await confirmBookingBalancePayment(id)
        : await rejectManualBalancePayment(id);

    return createResponse({
      booking: updated ? serializeBooking(updated) : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
