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
import {
  paymentSettingSchema,
  toManualTransferDetails,
} from "@/schemas/settingSchema";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import {
  mapSessionsForStorage,
  resolveBookingQuotation,
} from "@/utils/booking/createBooking";
import { serializeBooking } from "@/utils/booking/serializeBooking";
import { normalizeSessionDate } from "@/utils/booking/availability";
import { GOOGLE_IMPORT_PACKAGE_ID } from "@/utils/google/calendar";
import { SettingModel } from "@/models/Setting";
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
    const freelancerId = freelancer?._id
      ? toIdString(freelancer._id as never)
      : null;
    const settings = freelancerId
      ? await new SettingModel().findSettingsByUserId(freelancerId)
      : null;
    const paymentSettings = paymentSettingSchema.parse(
      settings?.payment ?? {}
    );
    const paymentMethod = paymentSettings.method;
    const manualTransfer = toManualTransferDetails(paymentSettings);

    return createResponse(
      toPublicBooking(
        booking,
        freelancer ? toPublicBookingFreelancer(freelancer) : null,
        paymentMethod,
        manualTransfer
      )
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
      const packageIds = data.packageIds ?? existing.packageIds;
      const isGoogleImportWithoutPackages =
        existing.source === "google_calendar" && packageIds.length === 0;
      const needsQuotation =
        !isGoogleImportWithoutPackages &&
        (data.packageIds !== undefined ||
          data.addOns !== undefined ||
          data.sessions !== undefined ||
          data.paymentOption !== undefined);

      let updatePayload: Parameters<typeof updateDashboardBooking>[1] = {};

      if (data.contact) {
        updatePayload.contact = data.contact;
      }
      if (data.status) {
        updatePayload.status = data.status;
      }

      if (isGoogleImportWithoutPackages && data.sessions) {
        updatePayload.sessions = data.sessions.map((session, index) => ({
          status: "scheduled" as const,
          name: session.name,
          packageId: session.packageId || GOOGLE_IMPORT_PACKAGE_ID,
          order: session.order ?? index,
          date: normalizeSessionDate(session.date),
          time_slot: session.time_slot,
          location: session.location,
          client_key: session.client_key,
        }));
        if (data.contact?.name) {
          updatePayload.packageNames = data.contact.name;
        }
      }

      if (needsQuotation) {
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
          packageIds,
          addOns: data.addOns ?? [],
          sessions,
          distanceKmBySessionKey: data.distanceKmBySessionKey,
          paymentOption: data.paymentOption ?? existing.paymentOption,
        };

        const { invoice, packageNames, resolvedSessionStyles, paymentOption } =
          await resolveBookingQuotation(userId, quotationInput, {
            relaxPaymentDeadline: true,
          });

        updatePayload = {
          ...updatePayload,
          packageIds,
          packageNames,
          addOnIds: (data.addOns ?? []).map((addOn) => addOn.id),
          sessions: mapSessionsForStorage(
            quotationInput,
            resolvedSessionStyles
          ),
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
