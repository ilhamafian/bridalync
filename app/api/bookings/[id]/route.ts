import { NextRequest } from "next/server";

import {
  deleteBooking,
  getBookingById,
  updateBookingStatus,
  updateDashboardBooking,
} from "@/utils/bookings";
import {
  dashboardBookingUpdateSchema,
  toPublicBooking,
  updateBookingStatusSchema,
  type CreateBookingRequest,
} from "@/schemas/bookingSchema";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import {
  mapSessionsForStorage,
  resolveBookingQuotation,
} from "@/utils/booking/createBooking";
import { serializeBooking } from "@/utils/booking/serializeBooking";
import { getFreelancerByUsername } from "@/utils/users";

function toPublicBookingFreelancer(
  freelancer: NonNullable<Awaited<ReturnType<typeof getFreelancerByUsername>>>
) {
  if (!freelancer.mobile || !freelancer.country_code) {
    return null;
  }

  return {
    name: freelancer.name?.trim() || freelancer.username || "Stylist",
    mobile: freelancer.mobile,
    country_code: freelancer.country_code,
  };
}

async function getAuthorizedOwnerId() {
  const user = await getSessionUser();
  if (!user || !isOnboardingComplete(user.onboarding)) {
    return null;
  }
  return toIdString(user._id) || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const freelancerUsername = req.nextUrl.searchParams.get("client");

    if (!freelancerUsername) {
      return createResponse({ error: "Client is required" }, 400);
    }

    const booking = await getBookingById(id);

    if (!booking || booking.freelancerUsername !== freelancerUsername) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    const freelancer = await getFreelancerByUsername(freelancerUsername);

    return createResponse(
      toPublicBooking(booking, freelancer ? toPublicBookingFreelancer(freelancer) : null)
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Dashboard owner update (no freelancerUsername in body)
    if (!("freelancerUsername" in body)) {
      const userId = await getAuthorizedOwnerId();
      if (!userId) {
        return createResponse({ error: "Unauthorized" }, 401);
      }

      const parsed = dashboardBookingUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return createResponse({ error: parsed.error.format() }, 400);
      }

      const existing = await getBookingById(id);
      if (!existing || existing.freelancerUserId !== userId) {
        return createResponse({ error: "Booking not found" }, 404);
      }

      const data = parsed.data;
      const needsQuotation =
        data.packageId !== undefined ||
        data.style !== undefined ||
        data.addOns !== undefined ||
        data.sessions !== undefined ||
        data.paymentOption !== undefined;

      let updatePayload: Parameters<typeof updateDashboardBooking>[1] = {};

      if (data.contact) {
        updatePayload.contact = data.contact;
      }
      if (data.status) {
        updatePayload.status = data.status;
      }

      if (needsQuotation) {
        const packageId = data.packageId ?? existing.packageId;
        const sessions = data.sessions;
        if (!sessions || sessions.length === 0) {
          return createResponse(
            { error: "Sessions are required when updating booking details." },
            400
          );
        }

        const quotationInput: CreateBookingRequest = {
          freelancerUsername: existing.freelancerUsername,
          intent: "booking",
          contact: data.contact ?? existing.contact,
          packageId,
          style: data.style,
          addOns: data.addOns ?? [],
          sessions,
          distanceKmBySessionKey: data.distanceKmBySessionKey,
          paymentOption: data.paymentOption ?? existing.paymentOption,
        };

        // When style was not sent but booking had one and charge is style-based,
        // resolveBookingQuotation will require style if charge_by is style.
        // Client should always send style when charge_by is style.
        const { invoice, packageName, styleId, styleName, paymentOption } =
          await resolveBookingQuotation(userId, quotationInput, {
            relaxPaymentDeadline: true,
          });

        updatePayload = {
          ...updatePayload,
          packageId,
          packageName,
          styleId,
          styleName,
          addOnIds: (data.addOns ?? []).map((addOn) => addOn.id),
          sessions: mapSessionsForStorage(quotationInput),
          invoice,
          paymentOption,
        };
      }

      const updated = await updateDashboardBooking(id, updatePayload);
      if (!updated) {
        return createResponse({ error: "Booking not found" }, 404);
      }

      return createResponse({ booking: serializeBooking(updated) });
    }

    // Public client status update
    const parsed = updateBookingStatusSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const booking = await getBookingById(id);

    if (!booking || booking.freelancerUsername !== parsed.data.freelancerUsername) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    if (booking.status !== "pending") {
      return createResponse({ error: "Booking can no longer be updated" }, 409);
    }

    const updated = await updateBookingStatus(id, parsed.data.status);

    if (!updated) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    const freelancer = await getFreelancerByUsername(parsed.data.freelancerUsername);

    return createResponse(
      toPublicBooking(updated, freelancer ? toPublicBookingFreelancer(freelancer) : null)
    );
  } catch (error) {
    if (error instanceof Error) {
      return createResponse({ error: error.message }, 400);
    }
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getAuthorizedOwnerId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const booking = await getBookingById(id);
    if (!booking || booking.freelancerUserId !== userId) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    await deleteBooking(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
