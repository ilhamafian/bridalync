import { NextRequest } from "next/server";
import { z } from "zod";

import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
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
    const user = await getSessionUser();
    if (!user || !isOnboardingComplete(user.onboarding)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = toIdString(user._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = verifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const booking = await getBookingById(id);
    if (!booking || booking.freelancerUserId !== userId) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    if (booking.paymentChannel !== "manual_transfer") {
      return createResponse(
        { error: "This booking is not a manual transfer payment." },
        400
      );
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
