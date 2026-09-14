import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { getAppUrl } from "@/utils/appUrl";
import type { PersistedBooking } from "@/schemas/bookingSchema";
import {
  ensurePaymentCapabilities,
  isAccountReadyForClientCharges,
} from "@/utils/stripe/connect";
import { buildBookingCheckoutMetadata } from "@/utils/stripe/metadata";

function toStripeAmount(rm: number) {
  return Math.round(rm * 100);
}

function isFpxAvailable(account: Awaited<ReturnType<typeof ensurePaymentCapabilities>>) {
  const status = account.capabilities?.fpx_payments;
  return status === "active" || status === "pending";
}

function checkoutPaymentMethodTypes(
  account: Awaited<ReturnType<typeof ensurePaymentCapabilities>>
): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  return isFpxAvailable(account) ? ["card", "fpx"] : ["card"];
}

async function prepareConnectedAccountForCheckout(stripeAccountId: string) {
  const account = await ensurePaymentCapabilities(stripeAccountId);
  if (!isAccountReadyForClientCharges(account)) {
    throw new Error("This stylist cannot accept payments yet.");
  }
  return account;
}

async function createConnectedCheckoutSession(
  params: Stripe.Checkout.SessionCreateParams,
  stripeAccountId: string,
  account: Awaited<ReturnType<typeof ensurePaymentCapabilities>>
) {
  const stripe = getStripe();
  const paymentMethodTypes = checkoutPaymentMethodTypes(account);

  try {
    return await stripe.checkout.sessions.create(
      {
        ...params,
        // Deferred Standard accounts have no Dashboard payment-method settings,
        // so dynamic methods resolve to none. Cards and FPX are valid for MYR.
        payment_method_types: paymentMethodTypes,
      },
      { stripeAccount: stripeAccountId }
    );
  } catch (error) {
    if (paymentMethodTypes.includes("fpx")) {
      return stripe.checkout.sessions.create(
        {
          ...params,
          payment_method_types: ["card"],
        },
        { stripeAccount: stripeAccountId }
      );
    }
    throw error;
  }
}

export async function createDepositCheckoutSession(input: {
  booking: PersistedBooking;
  freelancerUsername: string;
  stripeAccountId: string;
}) {
  const appUrl = getAppUrl();
  const bookingId = String(input.booking._id);
  const amountDueRm = input.booking.invoice.depositRm;
  const isFullPayment =
    input.booking.paymentOption === "full" ||
    input.booking.invoice.balanceRm === 0;

  if (amountDueRm <= 0) {
    throw new Error("This booking does not require a payment.");
  }

  const account = await prepareConnectedAccountForCheckout(input.stripeAccountId);

  const metadata = buildBookingCheckoutMetadata({
    booking: input.booking,
    freelancerUsername: input.freelancerUsername,
  });

  const productName = isFullPayment
    ? `Full payment — ${input.booking.packageNames}`
    : `Deposit — ${input.booking.packageNames}`;
  const productDescription = isFullPayment
    ? `Full booking payment with ${input.freelancerUsername} on Bridalync`
    : `Booking deposit with ${input.freelancerUsername} on Bridalync`;
  const paymentDescription = isFullPayment
    ? `Bridalync full payment — ${input.booking.packageNames} (${input.freelancerUsername})`
    : `Bridalync deposit — ${input.booking.packageNames} (${input.freelancerUsername})`;

  const session = await createConnectedCheckoutSession(
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
                packageName: metadata.packageNames,
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
    input.stripeAccountId,
    account
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
}) {
  const appUrl = getAppUrl();
  const bookingId = String(input.booking._id);
  const amountDueRm = input.booking.invoice.balanceRm;

  if (amountDueRm <= 0) {
    throw new Error("This booking has no remaining balance.");
  }

  const account = await prepareConnectedAccountForCheckout(input.stripeAccountId);

  const metadata = buildBookingCheckoutMetadata({
    booking: input.booking,
    freelancerUsername: input.freelancerUsername,
    purpose: "balance",
  });

  const productName = `Balance — ${input.booking.packageNames}`;
  const productDescription = `Remaining booking balance with ${input.freelancerUsername} on Bridalync`;
  const paymentDescription = `Bridalync balance — ${input.booking.packageNames} (${input.freelancerUsername})`;

  const session = await createConnectedCheckoutSession(
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
                packageName: metadata.packageNames,
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
    input.stripeAccountId,
    account
  );

  if (!session.url) {
    throw new Error("Could not create Stripe Checkout session.");
  }

  return session;
}
