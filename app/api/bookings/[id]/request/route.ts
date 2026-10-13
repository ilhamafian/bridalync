import { NextRequest } from "next/server";
import { z } from "zod";

import { SettingModel } from "@/models/Setting";
import type { PersistedBooking } from "@/schemas/bookingSchema";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { isSessionSlotTaken } from "@/utils/booking/availability";
import { getOccupiedSlotsForFreelancer } from "@/utils/booking/availability.server";
import { serializeBooking } from "@/utils/booking/serializeBooking";
import {
  approveBookingRequest,
  declineBookingRequest,
  ensureSessionRegions,
  findOverlappingBookingRequests,
  getBookingById,
} from "@/utils/bookings";
import { runAfterResponse } from "@/utils/runAfterResponse";
import {
  sendBookingAcceptedWhatsApp,
  sendBookingRejectedWhatsApp,
} from "@/utils/whatsapp/bookingTemplates";

const requestActionSchema = z.object({
  action: z.enum(["approve", "decline"]),
});

/** A booking no longer `requested`: answering it the same way again succeeds, so the app can safely retry. */
function answeredResponse(booking: PersistedBooking, approve: boolean) {
  const sameAnswer = approve
    ? Boolean(booking.requestApprovedAt) && booking.status !== "cancelled"
    : Boolean(booking.requestDeclinedAt);
  if (!sameAnswer) {
    return createResponse(
      { error: "This booking request was already answered." },
      409
    );
  }
  return createResponse({ booking: serializeBooking(booking), declinedIds: [] });
}

/**
 * The stylist approves (client can then pay; the slot is now held) or declines a booking request.
 * Approving declines every other open request that shares a slot with it.
 */
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
    const parsed = requestActionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const booking = await getBookingById(id);
    if (!booking || booking.freelancerUserId !== userId) {
      return createResponse({ error: "Booking not found" }, 404);
    }
    const approve = parsed.data.action === "approve";
    if (booking.status !== "requested") {
      return answeredResponse(booking, approve);
    }

    const settings = await new SettingModel().findSettingsByUserId(userId);
    const bufferRegions = settings?.travel.travel_buffer_regions;

    if (approve) {
      const occupied = await getOccupiedSlotsForFreelancer(userId);
      const taken = booking.sessions.some(
        (session) =>
          session.status !== "cancelled" && isSessionSlotTaken(session, occupied)
      );
      if (taken) {
        return createResponse(
          {
            error:
              "Another booking already has this slot. Decline this request instead.",
          },
          409
        );
      }
      if (bufferRegions?.length) {
        try {
          await ensureSessionRegions(booking);
        } catch (error) {
          console.error("Venue region lookup failed:", error);
          return createResponse(
            { error: "We couldn't check the venue's state right now. Please try again." },
            503
          );
        }
      }
    }

    const updated = approve
      ? await approveBookingRequest(id)
      : await declineBookingRequest(id);
    if (!updated) {
      const latest = await getBookingById(id);
      if (!latest) {
        return createResponse({ error: "Booking not found" }, 404);
      }
      return answeredResponse(latest, approve);
    }

    const declined: PersistedBooking[] = [];
    if (approve) {
      for (const competing of await findOverlappingBookingRequests(updated)) {
        const result = await declineBookingRequest(String(competing._id));
        if (result) declined.push(result);
      }
    }

    const stylistName = user.name;
    runAfterResponse("Booking request WhatsApp", async () => {
      if (approve) {
        await sendBookingAcceptedWhatsApp(updated, stylistName);
      } else {
        await sendBookingRejectedWhatsApp(updated, stylistName);
      }
    });
    for (const booking of declined) {
      runAfterResponse("Booking request declined WhatsApp", () =>
        sendBookingRejectedWhatsApp(booking, stylistName)
      );
    }

    return createResponse({
      booking: serializeBooking(updated),
      declinedIds: declined.map((booking) => String(booking._id)),
    });
  } catch (error) {
    return handleError(error);
  }
}
