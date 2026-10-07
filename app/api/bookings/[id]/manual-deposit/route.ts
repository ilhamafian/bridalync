import { put } from "@vercel/blob";
import { NextRequest } from "next/server";

import { SettingModel } from "@/models/Setting";
import {
  hasManualTransferDetails,
  paymentSettingSchema,
} from "@/schemas/settingSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { resolveRequestPaymentOption } from "@/utils/booking/pricing";
import {
  attachManualDepositReceipt,
  getBookingById,
} from "@/utils/bookings";
import { prepareFileForUpload } from "@/utils/image/upload";
import { RECEIPT_ALLOWED_TYPES } from "@/utils/payment/manualTransfer";
import { notifyDepositReceiptSubmitted } from "@/utils/push/bookingNotifications";

/** Transfer receipt for an approved booking request (public; `client` = the stylist's username). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const client = formData.get("client");
    const booking = await getBookingById(id);

    if (
      !booking ||
      typeof client !== "string" ||
      booking.freelancerUsername !== client.toLowerCase()
    ) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    if (booking.status !== "pending" || !booking.requestApprovedAt) {
      return createResponse(
        { error: "This booking can no longer be paid." },
        409
      );
    }

    if (booking.depositVerificationStatus === "pending") {
      return createResponse(
        { error: "A payment receipt is already pending verification." },
        409
      );
    }

    const settings = await new SettingModel().findSettingsByUserId(
      booking.freelancerUserId
    );
    const paymentSettings = paymentSettingSchema.parse(settings?.payment ?? {});
    if (
      paymentSettings.method !== "manual_transfer" ||
      !hasManualTransferDetails(paymentSettings)
    ) {
      return createResponse(
        { error: "This stylist doesn't accept bank transfers. Refresh and try again." },
        409
      );
    }

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

    const prepared = await prepareFileForUpload(receipt);
    const blob = await put(
      `payment-receipts/${id}/${prepared.fileName}`,
      prepared.data,
      {
        access: "public",
        addRandomSuffix: true,
        contentType: prepared.contentType,
      }
    );

    const requestedOption = formData.get("paymentOption");
    const paymentOption = resolveRequestPaymentOption(
      booking.invoice,
      booking.sessions,
      paymentSettings.balance_due_before,
      requestedOption === "full" ? "full" : "deposit"
    );

    const updated = await attachManualDepositReceipt(id, blob.url, paymentOption);
    if (updated) {
      try {
        await notifyDepositReceiptSubmitted(
          updated,
          paymentOption === "full" ? updated.invoice.totalRm : updated.invoice.depositRm,
          paymentOption === "full"
        );
      } catch (error) {
        console.error("Failed to send receipt push:", error);
      }
    }

    return createResponse(
      {
        id,
        depositVerificationStatus: updated?.depositVerificationStatus,
      },
      200
    );
  } catch (error) {
    return handleError(error);
  }
}
