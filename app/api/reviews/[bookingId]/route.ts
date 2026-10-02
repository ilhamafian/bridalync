import { NextRequest } from "next/server";
import { z } from "zod";

import { createReview, reviewModel } from "@/models/Review";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getBookingById } from "@/utils/bookings";
import {
  getBookingEventDate,
  isBookingReviewable,
  isReviewImageUrlForBooking,
  MAX_REVIEW_IMAGES,
} from "@/utils/reviews";
import { getFreelancerByUsername } from "@/utils/users";

const submitBookingReviewSchema = z.object({
  client: z.string().trim().min(1),
  comment: z.string().trim().min(1, "Please write a short review").max(2000),
  image_urls: z.array(z.string().trim().min(1)).max(MAX_REVIEW_IMAGES).default([]),
});

async function loadReviewContext(bookingId: string, client: string) {
  const booking = await getBookingById(bookingId);
  if (!booking || booking.freelancerUsername !== client) return null;
  return booking;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const client = req.nextUrl.searchParams.get("client");
    if (!client) {
      return createResponse({ error: "Client is required" }, 400);
    }

    const booking = await loadReviewContext(bookingId, client);
    if (!booking) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    const [freelancer, existing] = await Promise.all([
      getFreelancerByUsername(client),
      reviewModel.findByBookingId(bookingId),
    ]);

    return createResponse({
      clientName: booking.contact.name,
      freelancerName:
        freelancer?.name?.trim() || freelancer?.username || client,
      packageNames: booking.packageNames,
      eventDate: getBookingEventDate(booking)?.toISOString() ?? null,
      reviewable: isBookingReviewable(booking),
      alreadyReviewed: Boolean(existing),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const parsed = submitBookingReviewSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const booking = await loadReviewContext(bookingId, parsed.data.client);
    if (!booking) {
      return createResponse({ error: "Booking not found" }, 404);
    }
    if (!isBookingReviewable(booking)) {
      return createResponse(
        { error: "This booking can't be reviewed yet." },
        409
      );
    }
    if (await reviewModel.findByBookingId(bookingId)) {
      return createResponse(
        { error: "A review has already been submitted for this booking." },
        409
      );
    }

    const imageUrls = parsed.data.image_urls;
    if (
      !imageUrls.every((url) =>
        isReviewImageUrlForBooking(url, booking.freelancerUserId, bookingId)
      )
    ) {
      return createResponse({ error: "Invalid photo." }, 400);
    }

    await createReview({
      freelancerUserId: booking.freelancerUserId,
      bookingId,
      source: "booking",
      clientName: booking.contact.name,
      event_date: getBookingEventDate(booking) ?? undefined,
      comment: parsed.data.comment,
      image_urls: imageUrls,
    });

    return createResponse({ ok: true }, 201);
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      return createResponse(
        { error: "A review has already been submitted for this booking." },
        409
      );
    }
    return handleError(error);
  }
}
