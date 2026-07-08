import { NextRequest } from "next/server";

import { getBookingById, updateBookingStatus } from "@/utils/bookings";
import {
  toPublicBooking,
  updateBookingStatusSchema,
} from "@/schemas/bookingRecord";
import { createResponse, handleError } from "@/utils/apiHelper";
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
    return handleError(error);
  }
}
