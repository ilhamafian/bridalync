import { NextRequest } from "next/server";
import { z } from "zod";

import { bookingModel } from "@/models/Booking";
import { bookingSchema } from "@/schemas/bookingSchema";
import { timeOfDaySchema, timeSlotSchema } from "@/schemas/settingSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import {
  bookingMatchesClient,
  isClientEditable,
  isReceiptAwaitingReview,
} from "@/utils/booking/clientEdits";
import { quoteClientSchedule } from "@/utils/booking/clientSchedule.server";
import { toClientFacingBooking } from "@/utils/booking/publicClientBooking";
import { getBookingById } from "@/utils/bookings";
import { scheduleBookingCalendarSync } from "@/utils/google/syncBookingCalendar";
import { notifyClientRescheduled } from "@/utils/push/bookingNotifications";
import { runAfterResponse } from "@/utils/runAfterResponse";

const scheduleRequestSchema = z.object({
  client: z.string().min(1),
  /** False returns the new total without saving. */
  confirm: z.boolean().optional(),
  sessions: z
    .array(
      z.object({
        client_key: z.string().min(1),
        date: z.coerce.date(),
        time_slot: timeSlotSchema,
        ready_by: timeOfDaySchema.optional(),
      })
    )
    .min(1),
});

const scheduleFieldsSchema = bookingSchema
  .pick({
    sessions: true,
    invoice: true,
    paymentOption: true,
    packageNames: true,
    dayMode: true,
    collectedRm: true,
    platformFeeCollectedRm: true,
  })
  .partial();

/** Public: preview or save a new date, time, and ready-by for each session. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = scheduleRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse({ error: "Check the date and try again." }, 400);
    }

    const booking = await getBookingById(id);
    if (!booking || !bookingMatchesClient(booking, parsed.data.client)) {
      return createResponse({ error: "Booking not found" }, 404);
    }
    if (!isClientEditable(booking)) {
      return createResponse(
        { error: "This booking can no longer be changed." },
        409
      );
    }
    if (isReceiptAwaitingReview(booking)) {
      return createResponse(
        {
          error:
            "Dates can't be changed while a payment receipt is being reviewed.",
        },
        409
      );
    }

    const quote = await quoteClientSchedule(booking, parsed.data.sessions);
    if (!parsed.data.confirm) {
      return createResponse({
        preview: true,
        totalRm: quote.totalRm,
        previousTotalRm: quote.previousTotalRm,
        collectedRm: quote.collectedRm,
        dueRm: quote.dueRm,
        retainedRm: quote.retainedRm,
      });
    }

    await bookingModel.update(
      id,
      {
        sessions: quote.sessions,
        invoice: quote.invoice,
        paymentOption: quote.paymentOption,
        packageNames: quote.packageNames,
        ...(quote.dayMode ? { dayMode: quote.dayMode } : {}),
        ...(quote.storeCollected
          ? {
              collectedRm: quote.collectedRm,
              platformFeeCollectedRm: quote.platformFeeCollectedRm,
            }
          : {}),
      },
      scheduleFieldsSchema
    );
    scheduleBookingCalendarSync(id);

    const updated = await getBookingById(id);
    if (!updated) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    runAfterResponse("Client reschedule push", () =>
      notifyClientRescheduled(updated, quote.dueRm)
    );

    return createResponse(await toClientFacingBooking(updated));
  } catch (error) {
    if (error instanceof Error) {
      return createResponse({ error: error.message }, 400);
    }
    return handleError(error);
  }
}
