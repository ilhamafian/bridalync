import { NextRequest } from "next/server";

import { getStripe } from "@/lib/stripe";
import { createResponse } from "@/utils/apiHelper";
import {
  handleAccountUpdated,
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  handlePaymentIntentSucceeded,
} from "@/utils/stripe/webhook-handlers";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return createResponse({ error: "Webhook not configured" }, 500);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return createResponse({ error: "Missing stripe-signature header" }, 400);
  }

  const body = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return createResponse({ error: "Invalid signature" }, 400);
  }

  console.info("[stripe webhook] received", {
    type: event.type,
    id: event.id,
    account: event.account ?? "platform",
  });

  try {
    switch (event.type) {
      case "account.updated":
        await handleAccountUpdated(event.data.object as { id?: string });
        break;

      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as {
            metadata?: Record<string, string>;
            payment_intent?: string | { id?: string } | null;
          }
        );
        break;

      case "checkout.session.expired":
        await handleCheckoutSessionExpired(
          event.data.object as { metadata?: Record<string, string> }
        );
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as {
            metadata?: Record<string, string>;
            id?: string;
          }
        );
        break;

      default:
        if (
          event.type.includes("account") &&
          event.type.includes("requirements")
        ) {
          await handleAccountUpdated(event.data.object as { id?: string });
        }
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    return createResponse({ error: "Webhook handler failed" }, 500);
  }

  return createResponse({ received: true }, 200);
}
