import { NextRequest } from "next/server";
import { z } from "zod";

import { createResponse, handleError } from "@/utils/apiHelper";
import {
  bookingMatchesClient,
  isClientEditable,
} from "@/utils/booking/clientEdits";
import { toClientFacingBooking } from "@/utils/booking/publicClientBooking";
import { getBookingById, updateBookingStatus } from "@/utils/bookings";
import { notifyClientCancelled } from "@/utils/push/bookingNotifications";
import { runAfterResponse } from "@/utils/runAfterResponse";

const cancelRequestSchema = z.object({
  client: z.string().min(1),
});

/** Public: the client cancels. Nothing is refunded. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = cancelRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse({ error: "Booking not found" }, 400);
    }

    const booking = await getBookingById(id);
    if (!booking || !bookingMatchesClient(booking, parsed.data.client)) {
      return createResponse({ error: "Booking not found" }, 404);
    }
    if (!isClientEditable(booking)) {
      return createResponse(
        { error: "This booking can no longer be cancelled." },
        409
      );
    }

    const updated = await updateBookingStatus(id, "cancelled");
    if (!updated) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    runAfterResponse("Client cancel push", () => notifyClientCancelled(updated));

    return createResponse(await toClientFacingBooking(updated));
  } catch (error) {
    return handleError(error);
  }
}
