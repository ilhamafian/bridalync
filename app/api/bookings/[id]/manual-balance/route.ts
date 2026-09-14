import { put } from "@vercel/blob";
import { NextRequest } from "next/server";

import { SettingModel } from "@/models/Setting";
import { paymentSettingSchema } from "@/schemas/settingSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import {
  attachManualBalanceReceipt,
  getBookingById,
} from "@/utils/bookings";
import {
  RECEIPT_ALLOWED_TYPES,
  RECEIPT_MAX_SIZE_BYTES,
} from "@/utils/payment/manualTransfer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await getBookingById(id);

    if (!booking) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    if (
      booking.status !== "confirmed" ||
      booking.paymentOption !== "deposit" ||
      booking.invoice.balanceRm <= 0
    ) {
      return createResponse(
        { error: "This booking has no remaining balance." },
        409
      );
    }

    if (booking.balanceVerificationStatus === "pending") {
      return createResponse(
        { error: "A balance receipt is already pending verification." },
        409
      );
    }

    const settings = await new SettingModel().findSettingsByUserId(
      booking.freelancerUserId
    );
    const paymentMethod = paymentSettingSchema.parse(
      settings?.payment ?? {}
    ).method;

    if (paymentMethod !== "manual_transfer") {
      return createResponse(
        { error: "This stylist accepts balance payments via Stripe." },
        409
      );
    }

    const formData = await req.formData();
    const receipt = formData.get("receipt");

    if (!(receipt instanceof File)) {
      return createResponse({ error: "Payment receipt is required." }, 400);
    }

    if (!RECEIPT_ALLOWED_TYPES.has(receipt.type)) {
      return createResponse(
        { error: "Upload a JPEG, PNG, WebP, or GIF receipt." },
        400
      );
    }

    if (receipt.size > RECEIPT_MAX_SIZE_BYTES) {
      return createResponse(
        { error: "Receipt image must be 4 MB or smaller." },
        400
      );
    }

    const blob = await put(
      `payment-receipts/${id}/balance-${receipt.name}`,
      receipt,
      {
        access: "public",
        addRandomSuffix: true,
      }
    );

    const updated = await attachManualBalanceReceipt(id, blob.url);
    return createResponse(
      {
        id,
        balanceVerificationStatus: updated?.balanceVerificationStatus,
        balanceReceiptUrl: updated?.balanceReceiptUrl,
      },
      200
    );
  } catch (error) {
    return handleError(error);
  }
}
