import { NextRequest } from "next/server";
import { z } from "zod";

import { bookingModel } from "@/models/Booking";
import { bookingSchema } from "@/schemas/bookingSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import {
  bookingMatchesClient,
  isClientEditable,
} from "@/utils/booking/clientEdits";
import { toClientFacingBooking } from "@/utils/booking/publicClientBooking";
import { getBookingById } from "@/utils/bookings";
import { scheduleBookingCalendarSync } from "@/utils/google/syncBookingCalendar";
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

    await bookingModel.update(
      id,
      { status: "cancelled", clientCancelledAt: new Date() },
      bookingSchema.pick({ status: true, clientCancelledAt: true })
    );
    scheduleBookingCalendarSync(id);
    const updated = await getBookingById(id);
    if (!updated) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    runAfterResponse("Client cancel push", () => notifyClientCancelled(updated));

    return createResponse(await toClientFacingBooking(updated));
  } catch (error) {
    return handleError(error);
  }
}
