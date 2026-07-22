import { getStripe } from "@/lib/stripe";
import { getAppUrl } from "@/utils/appUrl";
import type { PersistedBooking } from "@/schemas/bookingSchema";
import {
  buildStripeOwner,
  ensurePaymentCapabilities,
} from "@/utils/stripe/connect";
import { buildBookingCheckoutMetadata } from "@/utils/stripe/metadata";

function toStripeAmount(rm: number) {
  return Math.round(rm * 100);
}

export async function createDepositCheckoutSession(input: {
  booking: PersistedBooking;
  freelancerUsername: string;
  stripeAccountId: string;
  owner: ReturnType<typeof buildStripeOwner>;
}) {
  const stripe = getStripe();
  const appUrl = getAppUrl();
  const bookingId = String(input.booking._id);
  const amountDueRm = input.booking.invoice.depositRm;
  const isFullPayment =
    input.booking.paymentOption === "full" ||
    input.booking.invoice.balanceRm === 0;

  if (amountDueRm <= 0) {
    throw new Error("This booking does not require a payment.");
  }

  // Deferred accounts can accept client payments. Full Stripe onboarding is only
  // required later when the freelancer withdraws to their bank account.
  await ensurePaymentCapabilities(input.stripeAccountId, input.owner);

  const metadata = buildBookingCheckoutMetadata({
    booking: input.booking,
    freelancerUsername: input.freelancerUsername,
  });

  const productName = isFullPayment
    ? `Full payment — ${input.booking.packageName}`
    : `Deposit — ${input.booking.packageName}`;
  const productDescription = isFullPayment
    ? `Full booking payment with ${input.freelancerUsername} on Bridalync`
    : `Booking deposit with ${input.freelancerUsername} on Bridalync`;
  const paymentDescription = isFullPayment
    ? `Bridalync full payment — ${input.booking.packageName} (${input.freelancerUsername})`
    : `Bridalync deposit — ${input.booking.packageName} (${input.freelancerUsername})`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.booking.contact.email,
      line_items: [
        {
          price_data: {
            currency: "myr",
            unit_amount: toStripeAmount(amountDueRm),
            product_data: {
              name: productName,
              description: productDescription,
              metadata: {
                bookingId: metadata.bookingId,
                packageName: metadata.packageName,
              },
            },
          },
          quantity: 1,
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
        description: paymentDescription,
      },
      success_url: `${appUrl}/${input.freelancerUsername}/bookings/${bookingId}?payment=success`,
      cancel_url: `${appUrl}/${input.freelancerUsername}?payment=cancelled`,
    },
    {
      stripeAccount: input.stripeAccountId,
    }
  );

  if (!session.url) {
    throw new Error("Could not create Stripe Checkout session.");
  }

  return session;
}

export async function createBalanceCheckoutSession(input: {
  booking: PersistedBooking;
  freelancerUsername: string;
  stripeAccountId: string;
  owner: ReturnType<typeof buildStripeOwner>;
}) {
  const stripe = getStripe();
  const appUrl = getAppUrl();
  const bookingId = String(input.booking._id);
  const amountDueRm = input.booking.invoice.balanceRm;

  if (amountDueRm <= 0) {
    throw new Error("This booking has no remaining balance.");
  }

  await ensurePaymentCapabilities(input.stripeAccountId, input.owner);

  const metadata = buildBookingCheckoutMetadata({
    booking: input.booking,
    freelancerUsername: input.freelancerUsername,
    purpose: "balance",
  });

  const productName = `Balance — ${input.booking.packageName}`;
  const productDescription = `Remaining booking balance with ${input.freelancerUsername} on Bridalync`;
  const paymentDescription = `Bridalync balance — ${input.booking.packageName} (${input.freelancerUsername})`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.booking.contact.email,
      line_items: [
        {
          price_data: {
            currency: "myr",
            unit_amount: toStripeAmount(amountDueRm),
            product_data: {
              name: productName,
              description: productDescription,
              metadata: {
                bookingId: metadata.bookingId,
                packageName: metadata.packageName,
              },
            },
          },
          quantity: 1,
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
        description: paymentDescription,
      },
      success_url: `${appUrl}/${input.freelancerUsername}/bookings/${bookingId}?payment=balance-success`,
      cancel_url: `${appUrl}/${input.freelancerUsername}/bookings/${bookingId}?payment=cancelled`,
    },
    {
      stripeAccount: input.stripeAccountId,
    }
  );

  if (!session.url) {
    throw new Error("Could not create Stripe Checkout session.");
  }

  return session;
}
