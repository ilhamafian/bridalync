import { list, put } from "@vercel/blob";
import { NextRequest } from "next/server";

import { reviewModel } from "@/models/Review";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getBookingById } from "@/utils/bookings";
import {
  prepareFileForUpload,
  UPLOAD_IMAGE_ALLOWED_TYPES,
} from "@/utils/image/upload";
import {
  getReviewImagePrefix,
  isBookingReviewable,
  MAX_REVIEW_IMAGE_UPLOADS_PER_BOOKING,
} from "@/utils/reviews";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const formData = await req.formData();
    const file = formData.get("file");
    const client = formData.get("client");

    if (typeof client !== "string" || !client.trim()) {
      return createResponse({ error: "Client is required" }, 400);
    }

    const booking = await getBookingById(bookingId);
    if (!booking || booking.freelancerUsername !== client.trim()) {
      return createResponse({ error: "Booking not found" }, 404);
    }
    if (!isBookingReviewable(booking)) {
      return createResponse({ error: "This booking can't be reviewed yet." }, 409);
    }
    if (await reviewModel.findByBookingId(bookingId)) {
      return createResponse(
        { error: "A review has already been submitted for this booking." },
        409
      );
    }

    if (!(file instanceof File)) {
      return createResponse({ error: "No file provided." }, 400);
    }
    if (!UPLOAD_IMAGE_ALLOWED_TYPES.has(file.type)) {
      return createResponse(
        { error: "Upload a JPEG, PNG, WebP, or GIF image." },
        400
      );
    }

    const prefix = getReviewImagePrefix(booking.freelancerUserId, bookingId);
    const existing = await list({
      prefix,
      limit: MAX_REVIEW_IMAGE_UPLOADS_PER_BOOKING,
    });
    if (existing.blobs.length >= MAX_REVIEW_IMAGE_UPLOADS_PER_BOOKING) {
      return createResponse(
        { error: "Too many photos uploaded for this booking." },
        429
      );
    }

    const prepared = await prepareFileForUpload(file);
    const blob = await put(`${prefix}${prepared.fileName}`, prepared.data, {
      access: "public",
      addRandomSuffix: true,
      contentType: prepared.contentType,
    });

    return createResponse({ url: blob.url }, 200);
  } catch (error) {
    return handleError(error);
  }
}
