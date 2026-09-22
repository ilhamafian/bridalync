import Stripe from "stripe";
import { NextRequest } from "next/server";
import { z } from "zod";

import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { toIdString } from "@/schemas/objectId";
import {
  buildStripeOwner,
  createOnboardingAccountLink,
  ensureStripeAccountId,
  syncPayoutOnboardingStatus,
  type ConnectFlow,
} from "@/utils/stripe/connect";

const bodySchema = z
  .object({
    flow: z.enum(["settings", "onboarding"]).optional(),
  })
  .optional();

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user?.email) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = toIdString(user._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    let flow: ConnectFlow = "settings";
    try {
      const json: unknown = await req.json();
      const parsed = bodySchema.safeParse(json);
      if (parsed.success && parsed.data?.flow) {
        flow = parsed.data.flow;
      }
    } catch {
      // Empty body is fine — defaults to settings flow.
    }

    const accountId = await ensureStripeAccountId(
      userId,
      buildStripeOwner(user),
      user.stripe_account_id
    );

    // Legacy v1 Standard accounts can already be payout-ready while our DB flag
    // is still false (return/webhook sync never completed after the v2 cutover).
    const alreadyReady = await syncPayoutOnboardingStatus(accountId);
    if (alreadyReady) {
      return createResponse({ ready: true }, 200);
    }

    const accountLink = await createOnboardingAccountLink(accountId, flow);

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
