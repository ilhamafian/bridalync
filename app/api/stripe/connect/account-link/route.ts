import Stripe from "stripe";

import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { toIdString } from "@/schemas/objectId";
import {
  buildStripeOwner,
  createOnboardingAccountLink,
  ensureStripeAccountId,
} from "@/utils/stripe/connect";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user?.email) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = toIdString(user._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const accountId = await ensureStripeAccountId(
      userId,
      buildStripeOwner(user),
      user.stripe_account_id
    );
    const accountLink = await createOnboardingAccountLink(accountId);

    if (!accountLink.url) {
      return createResponse({ error: "Could not create Stripe onboarding link." }, 500);
    }

    return createResponse({ url: accountLink.url }, 200);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      return createResponse(
        { error: error.message || "Stripe request failed." },
        error.statusCode ?? 400
      );
    }

    return handleError(error);
  }
}
