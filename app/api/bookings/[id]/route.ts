import { NextRequest } from "next/server";

import { getBookingById, updateBookingStatus } from "@/utils/bookings";
import {
  toPublicBooking,
  updateBookingStatusSchema,
} from "@/schemas/bookingRecord";
import { createResponse, handleError } from "@/utils/apiHelper";

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

    return createResponse(toPublicBooking(booking));
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

    return createResponse(toPublicBooking(updated));
  } catch (error) {
    return handleError(error);
  }
}
