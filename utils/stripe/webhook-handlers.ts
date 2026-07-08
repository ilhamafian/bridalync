import {
  confirmBookingPayment,
  markBookingPaymentFailed,
} from "@/utils/bookings";
import { getBookingIdFromMetadata } from "@/utils/stripe/metadata";
import { syncPayoutOnboardingStatus } from "@/utils/stripe/connect";

type StripeMetadata = Record<string, string> | undefined | null;

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

  await confirmBookingPayment(bookingId, paymentIntentId);
}

export async function handleBookingPaymentFailed(metadata: StripeMetadata) {
  const bookingId = getBookingIdFromMetadata(metadata);
  if (!bookingId) {
    console.warn("[stripe webhook] payment failed without bookingId metadata");
    return;
  }

  await markBookingPaymentFailed(bookingId);
}

export async function handleCheckoutSessionCompleted(session: {
  metadata?: StripeMetadata;
  payment_intent?: string | { id?: string } | null;
}) {
  await handleBookingPaymentConfirmed(
    session.metadata,
    getPaymentIntentId(session.payment_intent)
  );
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
  if (paymentIntent.metadata?.type !== "booking_deposit") {
    return;
  }

  await handleBookingPaymentConfirmed(paymentIntent.metadata, paymentIntent.id);
}

export async function handleAccountUpdated(account: { id?: string }) {
  if (account.id) {
    await syncPayoutOnboardingStatus(account.id);
  }
}
