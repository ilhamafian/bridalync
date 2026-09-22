import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/utils/auth/session";
import { getAppUrl } from "@/utils/appUrl";
import { toIdString } from "@/schemas/objectId";
import {
  buildStripeOwner,
  createOnboardingAccountLink,
  ensureStripeAccountId,
  syncPayoutOnboardingStatus,
  type ConnectFlow,
} from "@/utils/stripe/connect";

function parseFlow(req: NextRequest): ConnectFlow {
  return req.nextUrl.searchParams.get("flow") === "onboarding"
    ? "onboarding"
    : "settings";
}

export async function GET(req: NextRequest) {
  const appUrl = getAppUrl();
  const flow = parseFlow(req);
  const user = await getSessionUser();

  if (!user?.email) {
    return NextResponse.redirect(`${appUrl}/auth`);
  }

  const userId = toIdString(user._id);
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/auth`);
  }

  try {
    const accountId = await ensureStripeAccountId(
      userId,
      buildStripeOwner(user),
      user.stripe_account_id
    );

    const alreadyReady = await syncPayoutOnboardingStatus(accountId);
    if (alreadyReady) {
      if (flow === "onboarding") {
        return NextResponse.redirect(
          `${appUrl}/onboarding?step=username&stripe=ready`
        );
      }
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?stripe_payout=ready`
      );
    }

    const accountLink = await createOnboardingAccountLink(accountId, flow);

    if (!accountLink.url) {
      if (flow === "onboarding") {
        return NextResponse.redirect(
          `${appUrl}/onboarding?step=payment&stripe=error`
        );
      }
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?stripe_payout=error`
      );
    }

    return NextResponse.redirect(accountLink.url);
  } catch {
    if (flow === "onboarding") {
      return NextResponse.redirect(
        `${appUrl}/onboarding?step=payment&stripe=error`
      );
    }
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?stripe_payout=error`
    );
  }
}
