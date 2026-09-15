import { getStripe } from "@/lib/stripe";
import {
  confirmBookingBalancePayment,
  confirmBookingPayment,
  getBookingById,
} from "@/utils/bookings";
import { getFreelancerByUsername } from "@/utils/users";

function getPaymentIntentId(
  paymentIntent: string | { id?: string } | null | undefined
) {
  if (!paymentIntent) return undefined;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

/**
 * Confirms a booking from the Checkout success return when webhooks are delayed
 * or misconfigured. Safe to call repeatedly — confirm helpers are idempotent.
 */
export async function syncBookingCheckoutFromStripe(input: {
  bookingId: string;
  freelancerUsername: string;
  purpose: "deposit" | "balance";
}) {
  const username = input.freelancerUsername.toLowerCase();
  const booking = await getBookingById(input.bookingId);

  if (!booking || booking.freelancerUsername !== username) {
    return { ok: false as const, reason: "not_found" as const, booking: null };
  }

  const alreadySettled =
    input.purpose === "balance"
      ? booking.paymentOption === "full" || booking.invoice.balanceRm <= 0
      : booking.status === "confirmed";

  if (alreadySettled) {
    return { ok: true as const, reason: "already_confirmed" as const, booking };
  }

  if (!booking.stripeCheckoutSessionId) {
    return {
      ok: false as const,
      reason: "missing_session" as const,
      booking,
    };
  }

  const freelancer = await getFreelancerByUsername(username);
  if (!freelancer?.stripe_account_id) {
    return {
      ok: false as const,
      reason: "no_stripe_account" as const,
      booking,
    };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(
    booking.stripeCheckoutSessionId,
    { expand: ["payment_intent"] },
    { stripeAccount: freelancer.stripe_account_id }
  );

  if (session.payment_status !== "paid") {
    return {
      ok: false as const,
      reason: "not_paid" as const,
      booking,
    };
  }

  const sessionBookingId = session.metadata?.bookingId;
  if (sessionBookingId && sessionBookingId !== input.bookingId) {
    return {
      ok: false as const,
      reason: "session_mismatch" as const,
      booking,
    };
  }

  const paymentIntentId = getPaymentIntentId(session.payment_intent);

  if (input.purpose === "balance") {
    await confirmBookingBalancePayment(input.bookingId, paymentIntentId);
  } else {
    await confirmBookingPayment(input.bookingId, paymentIntentId);
  }

  const updated = await getBookingById(input.bookingId);
  return {
    ok: true as const,
    reason: "synced" as const,
    booking: updated,
  };
}
