import { NextRequest } from "next/server";

import { bookingModel } from "@/models/Booking";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionAdmin } from "@/utils/auth/admin-session";
import { serializeBooking } from "@/utils/booking/serializeBooking";

export async function GET(_req: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const bookings = await bookingModel.find(
      {
        $or: [
          { depositVerificationStatus: "pending" },
          { balanceVerificationStatus: "pending" },
        ],
      } as never,
      { sort: { created_at: -1 } }
    );

    return createResponse({
      bookings: bookings.map(serializeBooking),
    });
  } catch (error) {
    return handleError(error);
  }
}
