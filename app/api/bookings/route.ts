import { put } from "@vercel/blob";
import { NextRequest } from "next/server";
import { z } from "zod";

import { bookingModel, createBooking } from "@/models/Booking";
import { SettingModel } from "@/models/Setting";
import { createBookingRequestSchema } from "@/schemas/bookingSchema";
import { paymentSettingSchema, hasManualTransferDetails } from "@/schemas/settingSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { assertSessionsAvailable } from "@/utils/booking/availability.server";
import {
  mapSessionsForStorage,
  resolveBookingQuotation,
  resolveFreelancerForBooking,
} from "@/utils/booking/createBooking";
import { getBookingById, markBookingPaymentFailed } from "@/utils/bookings";
import { prepareFileForUpload } from "@/utils/image/upload";
import { RECEIPT_ALLOWED_TYPES } from "@/utils/payment/manualTransfer";
import { notifyNewClientBooking } from "@/utils/push/bookingNotifications";
import {
  isAccountReadyForClientCharges,
  retrieveConnectedAccount,
} from "@/utils/stripe/connect";
import { freelancerExists } from "@/utils/users";

async function parseBookingBody(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const payloadRaw = formData.get("payload");
    if (typeof payloadRaw !== "string") {
      return {
        error: createResponse({ error: "Missing booking payload." }, 400),
      };
    }

    let json: unknown;
    try {
      json = JSON.parse(payloadRaw);
    } catch {
      return {
        error: createResponse({ error: "Invalid booking payload." }, 400),
      };
    }

    const receipt = formData.get("receipt");
    return {
      body: json,
      receipt: receipt instanceof File ? receipt : null,
    };
  }

  return { body: await req.json(), receipt: null };
}

export async function POST(req: NextRequest) {
  let createdBookingId: string | null = null;

  try {
    const parsedRequest = await parseBookingBody(req);
    if ("error" in parsedRequest && parsedRequest.error) {
      return parsedRequest.error;
    }

    const { body, receipt } = parsedRequest;
    const parsed = createBookingRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const data = parsed.data;
    const exists = await freelancerExists(data.freelancerUsername);

    if (!exists) {
      return createResponse({ error: "Freelancer not found" }, 404);
    }

    const freelancer = await resolveFreelancerForBooking(data.freelancerUsername);
    if (!freelancer) {
      return createResponse({ error: "Freelancer not found" }, 404);
    }

    const settings = await new SettingModel().findSettingsByUserId(
      freelancer.userId
    );
    const paymentSettings = paymentSettingSchema.parse(settings?.payment ?? {});
    const paymentMethod = paymentSettings.method;

    if (data.intent === "booking") {
      if (paymentMethod === "payment_gateway") {
        if (!freelancer.user.stripe_account_id) {
          return createResponse(
            { error: "This stylist is not ready to accept bookings yet." },
            503
          );
        }

        const account = await retrieveConnectedAccount(
          freelancer.user.stripe_account_id
        );
        if (!isAccountReadyForClientCharges(account)) {
          return createResponse(
            { error: "This stylist cannot accept payments yet." },
            503
          );
        }
      } else if (!hasManualTransferDetails(paymentSettings)) {
        return createResponse(
          {
            error:
              "This stylist has not set up manual transfer details yet. Try again later or contact them.",
          },
          503
        );
      } else if (!receipt) {
        return createResponse(
          { error: "Payment receipt is required for manual transfer." },
          400
        );
      }
    }

    if (receipt) {
      if (!RECEIPT_ALLOWED_TYPES.has(receipt.type)) {
        return createResponse(
          { error: "Upload a JPEG, PNG, WebP, or GIF receipt." },
          400
        );
      }
    }

    try {
      await assertSessionsAvailable(freelancer.userId, data.sessions);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "One or more selected sessions are no longer available.";
      return createResponse({ error: message }, 409);
    }

    const { invoice, packageNames, resolvedSessionStyles, paymentOption } =
      await resolveBookingQuotation(freelancer.userId, data);

    const isManualBooking =
      data.intent === "booking" && paymentMethod === "manual_transfer";

    const booking = await createBooking({
      freelancerUsername: data.freelancerUsername.toLowerCase(),
      freelancerUserId: freelancer.userId,
      contact: data.contact,
      packageIds: data.packageIds,
      packageNames,
      addOnIds: data.addOns.map((addOn) => addOn.id),
      sessions: mapSessionsForStorage(data, resolvedSessionStyles),
      invoice,
      paymentOption,
      status: data.intent === "booking" ? "pending" : "enquiry",
      ...(data.intent === "booking"
        ? {
            paymentChannel: paymentMethod,
            ...(isManualBooking
              ? { depositVerificationStatus: "pending" as const }
              : {}),
          }
        : {}),
    });

    createdBookingId = booking._id.toString();

    if (isManualBooking && receipt) {
      const prepared = await prepareFileForUpload(receipt);
      const blob = await put(
        `payment-receipts/${createdBookingId}/${prepared.fileName}`,
        prepared.data,
        {
          access: "public",
          addRandomSuffix: true,
          contentType: prepared.contentType,
        }
      );

      await bookingModel.update(
        createdBookingId,
        { depositReceiptUrl: blob.url },
        z.object({ depositReceiptUrl: z.string() })
      );
    }

    const persisted = await getBookingById(createdBookingId);
    if (
      persisted &&
      (persisted.status === "enquiry" || isManualBooking)
    ) {
      try {
        await notifyNewClientBooking(persisted);
      } catch (error) {
        console.error("Failed to send new booking push:", error);
      }
    }

    return createResponse(
      {
        id: createdBookingId,
        status: booking.status,
        invoice: booking.invoice,
        paymentChannel: paymentMethod,
        requiresCheckout: data.intent === "booking" && !isManualBooking,
      },
      201
    );
  } catch (error) {
    if (createdBookingId) {
      try {
        await markBookingPaymentFailed(createdBookingId);
      } catch (cleanupError) {
        console.error("Failed to roll back booking after error:", cleanupError);
      }
    }
    return handleError(error);
  }
}
