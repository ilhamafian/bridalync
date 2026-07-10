import { NextRequest } from "next/server";

import { createBooking } from "@/models/Booking";
import {
  manualBookingInputSchema,
  type CreateBookingRequest,
} from "@/schemas/bookingRecord";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import {
  mapSessionsForStorage,
  resolveBookingQuotation,
} from "@/utils/booking/createBooking";
import { serializeBooking } from "@/utils/booking/serializeBooking";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !isOnboardingComplete(user.onboarding)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const username = user.username?.trim().toLowerCase();
    if (!username) {
      return createResponse({ error: "Username is required" }, 400);
    }

    const userId = toIdString(user._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = manualBookingInputSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const data = parsed.data;
    const quotationInput: CreateBookingRequest = {
      freelancerUsername: username,
      intent: "booking",
      contact: data.contact,
      packageId: data.packageId,
      style: data.style,
      addOns: data.addOns,
      sessions: data.sessions,
      distanceKmBySessionKey: data.distanceKmBySessionKey,
      paymentOption: data.paymentOption,
    };

    const { invoice, packageName, styleId, styleName, paymentOption } =
      await resolveBookingQuotation(userId, quotationInput, {
        relaxPaymentDeadline: true,
      });

    const booking = await createBooking({
      freelancerUsername: username,
      freelancerUserId: userId,
      contact: data.contact,
      packageId: data.packageId,
      packageName,
      styleId,
      styleName,
      addOnIds: data.addOns.map((addOn) => addOn.id),
      sessions: mapSessionsForStorage(quotationInput),
      invoice,
      paymentOption,
      status: data.status,
    });

    return createResponse({ booking: serializeBooking(booking) }, 201);
  } catch (error) {
    if (error instanceof Error) {
      return createResponse({ error: error.message }, 400);
    }
    return handleError(error);
  }
}
