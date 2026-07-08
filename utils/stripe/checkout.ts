import { getStripe } from "@/lib/stripe";
import { getAppUrl } from "@/utils/appUrl";
import type { PersistedBookingRecord } from "@/schemas/bookingRecord";
import {
  buildStripeOwner,
  ensurePaymentCapabilities,
} from "@/utils/stripe/connect";
import { buildBookingCheckoutMetadata } from "@/utils/stripe/metadata";

function toStripeAmount(rm: number) {
  return Math.round(rm * 100);
}

export async function createDepositCheckoutSession(input: {
  booking: PersistedBookingRecord;
  freelancerUsername: string;
  stripeAccountId: string;
  owner: ReturnType<typeof buildStripeOwner>;
}) {
  const stripe = getStripe();
  const appUrl = getAppUrl();
  const bookingId = String(input.booking._id);
  const depositRm = input.booking.invoice.depositRm;

  if (depositRm <= 0) {
    throw new Error("This booking does not require a deposit payment.");
  }

  // Deferred accounts can accept client payments. Full Stripe onboarding is only
  // required later when the freelancer withdraws to their bank account.
  await ensurePaymentCapabilities(input.stripeAccountId, input.owner);

  const metadata = buildBookingCheckoutMetadata({
    booking: input.booking,
    freelancerUsername: input.freelancerUsername,
  });

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.booking.contact.email,
      line_items: [
        {
          price_data: {
            currency: "myr",
            unit_amount: toStripeAmount(depositRm),
            product_data: {
              name: `Deposit — ${input.booking.packageName}`,
              description: `Booking deposit with ${input.freelancerUsername} on Bridalync`,
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
        description: `Bridalync deposit — ${input.booking.packageName} (${input.freelancerUsername})`,
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
