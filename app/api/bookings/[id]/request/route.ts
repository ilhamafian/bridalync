import { NextRequest } from "next/server";
import { z } from "zod";

import { SettingModel } from "@/models/Setting";
import { toIdString } from "@/schemas/objectId";
import { paymentSettingSchema } from "@/schemas/settingSchema";
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
import {
  sendBookingRequestApprovedEmail,
  sendBookingRequestDeclinedEmail,
} from "@/utils/email/booking-request";

const requestActionSchema = z.object({
  action: z.enum(["approve", "decline"]),
});

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
    if (booking.status !== "requested") {
      return createResponse(
        { error: "This booking request was already answered." },
        409
      );
    }

    const approve = parsed.data.action === "approve";
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

    const declinedIds: string[] = [];
    if (approve && updated) {
      for (const competing of await findOverlappingBookingRequests(updated)) {
        const competingId = String(competing._id);
        const declined = await declineBookingRequest(competingId);
        if (!declined) continue;
        declinedIds.push(competingId);
        try {
          await sendBookingRequestDeclinedEmail(declined, user.name);
        } catch (error) {
          console.error("Failed to send booking request email:", error);
        }
      }
    }

    if (updated) {
      try {
        if (approve) {
          await sendBookingRequestApprovedEmail(
            updated,
            user.name,
            paymentSettingSchema.parse(settings?.payment ?? {}).balance_due_before
          );
        } else {
          await sendBookingRequestDeclinedEmail(updated, user.name);
        }
      } catch (error) {
        console.error("Failed to send booking request email:", error);
      }
    }

    return createResponse({
      booking: updated ? serializeBooking(updated) : null,
      declinedIds,
    });
  } catch (error) {
    return handleError(error);
  }
}
