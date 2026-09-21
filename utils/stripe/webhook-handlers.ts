import {
  confirmBookingBalancePayment,
  confirmBookingPayment,
  markBookingPaymentFailed,
} from "@/utils/bookings";
import {
  getBookingIdFromMetadata,
  isBookingBalancePayment,
  isBookingInitialPayment,
} from "@/utils/stripe/metadata";
import { syncPayoutOnboardingStatus } from "@/utils/stripe/connect";

type StripeMetadata = Record<string, string> | undefined | null;

type CheckoutSessionLike = {
  id?: string;
  metadata?: StripeMetadata;
  payment_status?: string | null;
  payment_intent?: string | { id?: string } | null;
};

function getPaymentIntentId(
  paymentIntent: string | { id?: string } | null | undefined
) {
  if (!paymentIntent) return undefined;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

export async function handleBookingPaymentConfirmed(
  metadata: StripeMetadata,
  paymentIntentId?: string | null
) {
  const bookingId = getBookingIdFromMetadata(metadata);
  if (!bookingId) {
    console.warn("[stripe webhook] payment confirmed without bookingId metadata");
    return;
  }

  if (isBookingBalancePayment(metadata)) {
    await confirmBookingBalancePayment(bookingId, paymentIntentId);
    return;
  }

  await confirmBookingPayment(bookingId, paymentIntentId);
}

export async function handleBookingPaymentFailed(metadata: StripeMetadata) {
  const bookingId = getBookingIdFromMetadata(metadata);
  if (!bookingId) {
    console.warn("[stripe webhook] payment failed without bookingId metadata");
    return;
  }

  // Balance checkout expiry should not fail an already-confirmed booking.
  if (isBookingBalancePayment(metadata)) {
    return;
  }

  await markBookingPaymentFailed(bookingId);
}

/**
 * Confirm only when Checkout reports the session as paid.
 * Delayed methods (e.g. FPX) can emit checkout.session.completed while still
 * unpaid — wait for async_payment_succeeded / payment_intent.succeeded instead.
 */
export async function handleCheckoutSessionCompleted(
  session: CheckoutSessionLike
) {
  if (session.payment_status !== "paid") {
    console.info(
      "[stripe webhook] checkout.session.completed not paid yet — skipping confirm",
      {
        sessionId: session.id,
        paymentStatus: session.payment_status ?? null,
        bookingId: getBookingIdFromMetadata(session.metadata),
      }
    );
    return;
  }

  await handleBookingPaymentConfirmed(
    session.metadata,
    getPaymentIntentId(session.payment_intent)
  );
}

export async function handleCheckoutSessionAsyncPaymentSucceeded(
  session: CheckoutSessionLike
) {
  await handleBookingPaymentConfirmed(
    session.metadata,
    getPaymentIntentId(session.payment_intent)
  );
}

export async function handleCheckoutSessionAsyncPaymentFailed(
  session: CheckoutSessionLike
) {
  await handleBookingPaymentFailed(session.metadata);
}

export async function handleCheckoutSessionExpired(session: {
  metadata?: StripeMetadata;
}) {
  await handleBookingPaymentFailed(session.metadata);
}

export async function handlePaymentIntentSucceeded(paymentIntent: {
  metadata?: StripeMetadata;
  id?: string;
}) {
  if (
    !isBookingInitialPayment(paymentIntent.metadata) &&
    !isBookingBalancePayment(paymentIntent.metadata)
  ) {
    return;
  }

  await handleBookingPaymentConfirmed(paymentIntent.metadata, paymentIntent.id);
}

export async function handleAccountUpdated(account: { id?: string }) {
  if (account.id) {
    await syncPayoutOnboardingStatus(account.id);
  }
}
