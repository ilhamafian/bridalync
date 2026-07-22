import { NextRequest } from "next/server";

import { createBooking } from "@/models/Booking";
import { createBookingRequestSchema } from "@/schemas/bookingSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { assertSessionsAvailable } from "@/utils/booking/availability.server";
import {
  mapSessionsForStorage,
  resolveBookingQuotation,
  resolveFreelancerForBooking,
} from "@/utils/booking/createBooking";
import { notifyNewClientBooking } from "@/utils/push/bookingNotifications";
import { freelancerExists } from "@/utils/users";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createBookingRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const data = parsed.data;
    const exists = await freelancerExists(data.freelancerUsername);

    if (!exists) {
      return createResponse({ error: "Freelancer not found" }, 404);
    }

    const freelancer = await resolveFreelancerForBooking(data.freelancerUsername);
    if (!freelancer) {
      return createResponse({ error: "Freelancer not found" }, 404);
    }

    if (data.intent === "booking" && !freelancer.user.stripe_account_id) {
      return createResponse(
        { error: "This stylist is not ready to accept bookings yet." },
        503
      );
    }

    try {
      await assertSessionsAvailable(freelancer.userId, data.sessions);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "One or more selected sessions are no longer available.";
      return createResponse({ error: message }, 409);
    }

    const { invoice, packageName, styleId, styleName, paymentOption } =
      await resolveBookingQuotation(freelancer.userId, data);

    const booking = await createBooking({
      freelancerUsername: data.freelancerUsername.toLowerCase(),
      freelancerUserId: freelancer.userId,
      contact: data.contact,
      packageId: data.packageId,
      packageName,
      styleId,
      styleName,
      addOnIds: data.addOns.map((addOn) => addOn.id),
      sessions: mapSessionsForStorage(data),
      invoice,
      paymentOption,
      status: data.intent === "booking" ? "pending" : "enquiry",
    });

    try {
      await notifyNewClientBooking(booking);
    } catch (error) {
      console.error("Failed to send new booking push:", error);
    }

    return createResponse(
      {
        id: booking._id.toString(),
        status: booking.status,
        invoice: booking.invoice,
      },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
