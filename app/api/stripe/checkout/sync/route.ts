import { NextRequest } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { createResponse, handleError } from "@/utils/apiHelper";
import { syncBookingCheckoutFromStripe } from "@/utils/stripe/syncCheckoutPayment";

const syncRequestSchema = z.object({
  bookingId: z.string().min(1),
  freelancerUsername: z.string().min(1),
  purpose: z.enum(["deposit", "balance"]).default("deposit"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = syncRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const result = await syncBookingCheckoutFromStripe(parsed.data);

    if (result.reason === "not_found") {
      return createResponse({ error: "Booking not found" }, 404);
    }

    return createResponse({
      confirmed: result.ok,
      reason: result.reason,
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      return createResponse(
        { error: error.message || "Stripe request failed." },
        error.statusCode ?? 400
      );
    }

    if (error instanceof Error) {
      return createResponse({ error: error.message }, 400);
    }

    return handleError(error);
  }
}
