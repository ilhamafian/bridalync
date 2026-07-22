import { NextRequest } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { bookingModel } from "@/models/Booking";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getBookingById } from "@/utils/bookings";
import {
  createBalanceCheckoutSession,
  createDepositCheckoutSession,
} from "@/utils/stripe/checkout";
import { buildStripeOwner } from "@/utils/stripe/connect";
import { getFreelancerByUsername } from "@/utils/users";

const checkoutRequestSchema = z.object({
  bookingId: z.string().min(1),
  freelancerUsername: z.string().min(1),
  purpose: z.enum(["deposit", "balance"]).default("deposit"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const { bookingId, freelancerUsername, purpose } = parsed.data;
    const booking = await getBookingById(bookingId);

    if (
      !booking ||
      booking.freelancerUsername !== freelancerUsername.toLowerCase()
    ) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    if (purpose === "deposit") {
      if (booking.status !== "pending") {
        return createResponse({ error: "Booking can no longer be paid." }, 409);
      }
    } else {
      if (booking.status !== "confirmed") {
        return createResponse(
          { error: "Balance can only be paid on a confirmed booking." },
          409
        );
      }
      if (booking.paymentOption !== "deposit" || booking.invoice.balanceRm <= 0) {
        return createResponse(
          { error: "This booking has no remaining balance." },
          409
        );
      }
    }

    const freelancer = await getFreelancerByUsername(freelancerUsername);
    if (!freelancer?.stripe_account_id) {
      return createResponse(
        { error: "This stylist cannot accept payments yet." },
        503
      );
    }

    const session =
      purpose === "balance"
        ? await createBalanceCheckoutSession({
            booking,
            freelancerUsername: freelancerUsername.toLowerCase(),
            stripeAccountId: freelancer.stripe_account_id,
            owner: buildStripeOwner(freelancer),
          })
        : await createDepositCheckoutSession({
            booking,
            freelancerUsername: freelancerUsername.toLowerCase(),
            stripeAccountId: freelancer.stripe_account_id,
            owner: buildStripeOwner(freelancer),
          });

    await bookingModel.update(
      bookingId,
      { stripeCheckoutSessionId: session.id },
      z.object({ stripeCheckoutSessionId: z.string() })
    );

    return createResponse({ url: session.url }, 200);
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
