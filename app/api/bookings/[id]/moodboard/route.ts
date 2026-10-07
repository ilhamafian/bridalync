import { list, put } from "@vercel/blob";
import { NextRequest } from "next/server";
import { z } from "zod";

import { bookingModel } from "@/models/Booking";
import { SettingModel } from "@/models/Setting";
import {
  bookingClientDetailsSchema,
  MAX_MOODBOARD_IMAGES,
} from "@/schemas/clientInfoSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import {
  getMoodboardPrefix,
  MOODBOARD_PDF_TYPE,
} from "@/utils/booking/clientInfo";
import { getBookingById } from "@/utils/bookings";
import {
  prepareFileForUpload,
  UPLOAD_IMAGE_ALLOWED_TYPES,
  UPLOAD_IMAGE_MAX_BYTES,
} from "@/utils/image/upload";

/** Clients upload right after creating the booking; later uploads are rejected. */
const UPLOAD_WINDOW_MS = 30 * 60 * 1000;

async function preparePdf(file: File) {
  const data = Buffer.from(await file.arrayBuffer());
  if (data.subarray(0, 5).toString("latin1") !== "%PDF-") return null;
  const base = file.name.replace(/\.[^.]+$/, "") || "moodboard";
  return { data, contentType: MOODBOARD_PDF_TYPE, fileName: `${base}.pdf` };
}

/** Public: attach one moodboard photo or PDF to a booking the client just created. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file");
    const client = formData.get("client");

    if (typeof client !== "string" || !client.trim()) {
      return createResponse({ error: "Client is required" }, 400);
    }

    const booking = await getBookingById(id);
    if (
      !booking ||
      booking.freelancerUsername !== client.trim().toLowerCase()
    ) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    const createdAt = booking.created_at
      ? new Date(booking.created_at).getTime()
      : 0;
    if (
      (booking.status !== "pending" &&
        booking.status !== "enquiry" &&
        booking.status !== "requested") ||
      Date.now() - createdAt > UPLOAD_WINDOW_MS
    ) {
      return createResponse(
        { error: "Moodboard files can no longer be added to this booking." },
        409
      );
    }

    const settings = await new SettingModel().findSettingsByUserId(
      booking.freelancerUserId
    );
    if (!settings?.client_info?.moodboard) {
      return createResponse({ error: "Moodboard uploads are turned off." }, 409);
    }

    if (!(file instanceof File)) {
      return createResponse({ error: "No file provided." }, 400);
    }
    const isPdf = file.type === MOODBOARD_PDF_TYPE;
    if (!isPdf && !UPLOAD_IMAGE_ALLOWED_TYPES.has(file.type)) {
      return createResponse(
        { error: "Upload a JPEG, PNG, WebP, or GIF image, or a PDF." },
        400
      );
    }
    if (isPdf && file.size > UPLOAD_IMAGE_MAX_BYTES) {
      return createResponse({ error: "PDFs must be 4 MB or smaller." }, 400);
    }

    const prefix = getMoodboardPrefix(booking.freelancerUserId, id);
    const existing = await list({ prefix, limit: MAX_MOODBOARD_IMAGES });
    if (existing.blobs.length >= MAX_MOODBOARD_IMAGES) {
      return createResponse(
        { error: `You can add up to ${MAX_MOODBOARD_IMAGES} files.` },
        429
      );
    }

    const prepared = isPdf
      ? await preparePdf(file)
      : await prepareFileForUpload(file);
    if (!prepared) {
      return createResponse({ error: "That file isn't a valid PDF." }, 400);
    }
    const blob = await put(`${prefix}${prepared.fileName}`, prepared.data, {
      access: "public",
      addRandomSuffix: true,
      contentType: prepared.contentType,
    });

    const moodboardUrls = [
      ...(booking.clientDetails?.moodboardUrls ?? []),
      blob.url,
    ].slice(0, MAX_MOODBOARD_IMAGES);
    await bookingModel.update(
      id,
      { clientDetails: { ...booking.clientDetails, moodboardUrls } },
      z.object({ clientDetails: bookingClientDetailsSchema })
    );

    return createResponse({ url: blob.url }, 200);
  } catch (error) {
    return handleError(error);
  }
}
