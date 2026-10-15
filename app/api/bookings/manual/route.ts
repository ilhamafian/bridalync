import { NextRequest } from "next/server";

import { createBooking } from "@/models/Booking";
import {
  manualBookingInputSchema,
  type CreateBookingRequest,
} from "@/schemas/bookingSchema";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { assertSessionsAvailable } from "@/utils/booking/availability.server";
import { resolveOptionalInstagram } from "@/utils/booking/clientInfo";
import { resolveBookingQuotation } from "@/utils/booking/createBooking";
import { serializeBooking } from "@/utils/booking/serializeBooking";
import { scheduleBookingCalendarSync } from "@/utils/google/syncBookingCalendar";

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
    if (!data.customEvent && data.packageIds.length < 1) {
      return createResponse({ error: "Choose an event." }, 400);
    }

    const quotationInput: CreateBookingRequest = {
      freelancerUsername: username,
      intent: "booking",
      contact: data.contact,
      packageIds: data.customEvent ? [] : data.packageIds,
      addOns: data.addOns,
      sessions: data.sessions,
      paymentOption: data.paymentOption,
    };

    try {
      await assertSessionsAvailable(userId, data.sessions);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "One or more selected slots are unavailable.";
      return createResponse({ error: message }, 409);
    }

    const { invoice, packageNames, sessions, dayMode, paymentOption } =
      await resolveBookingQuotation(userId, quotationInput, {
        relaxPaymentDeadline: true,
        discountedTotalRm: data.totalRm,
        customEvent: data.customEvent,
        customAddOns: data.customAddOns,
      });

    const instagram =
      data.instagram !== undefined
        ? resolveOptionalInstagram(data.instagram)
        : undefined;

    const booking = await createBooking({
      freelancerUsername: username,
      freelancerUserId: userId,
      contact: data.contact,
      ...(instagram ? { clientDetails: { instagram } } : {}),
      packageIds: data.customEvent ? [] : data.packageIds,
      packageNames,
      ...(data.customEvent ? { customEvent: data.customEvent } : {}),
      ...(data.customAddOns.length > 0
        ? { customAddOns: data.customAddOns }
        : {}),
      dayMode,
      addOnIds: data.addOns.map((addOn) => addOn.id),
      sessions,
      invoice,
      paymentOption,
      ...(data.remarks ? { remarks: data.remarks } : {}),
      // The client always pays from the booking link. Deposit vs full is the stylist's choice.
      status: "pending",
      paymentLinkAt: new Date(),
    });
    scheduleBookingCalendarSync(booking._id.toString());

    return createResponse({ booking: serializeBooking(booking) }, 201);
  } catch (error) {
    if (error instanceof Error) {
      return createResponse({ error: error.message }, 400);
    }
    return handleError(error);
  }
}
