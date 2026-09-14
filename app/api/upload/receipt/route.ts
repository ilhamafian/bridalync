import { put } from "@vercel/blob";
import { NextRequest } from "next/server";

import { createResponse, handleError } from "@/utils/apiHelper";
import { prepareFileForUpload } from "@/utils/image/upload";
import { RECEIPT_ALLOWED_TYPES } from "@/utils/payment/manualTransfer";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const bookingId = formData.get("bookingId");

    if (!(file instanceof File)) {
      return createResponse({ error: "No file provided." }, 400);
    }

    if (!RECEIPT_ALLOWED_TYPES.has(file.type)) {
      return createResponse(
        { error: "Upload a JPEG, PNG, WebP, or GIF image." },
        400
      );
    }

    const prepared = await prepareFileForUpload(file);

    const folder =
      typeof bookingId === "string" && bookingId.trim().length > 0
        ? `payment-receipts/${bookingId.trim()}`
        : "payment-receipts/pending";

    const blob = await put(`${folder}/${prepared.fileName}`, prepared.data, {
      access: "public",
      addRandomSuffix: true,
      contentType: prepared.contentType,
    });

    return createResponse({ url: blob.url }, 200);
  } catch (error) {
    return handleError(error);
  }
}
