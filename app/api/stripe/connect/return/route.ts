import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/utils/auth/session";
import { getAppUrl } from "@/utils/appUrl";
import { toIdString } from "@/schemas/objectId";
import {
  refreshSession,
  updateOnboardingProgress,
} from "@/utils/onboarding/progress";
import {
  classifyPayoutOnboardingStatus,
  retrieveConnectedAccount,
  syncPayoutOnboardingStatus,
  type ConnectFlow,
} from "@/utils/stripe/connect";

function parseFlow(req: NextRequest): ConnectFlow {
  return req.nextUrl.searchParams.get("flow") === "onboarding"
    ? "onboarding"
    : "settings";
}

function settingsRedirect(appUrl: string, status: string) {
  return NextResponse.redirect(
    `${appUrl}/dashboard/settings?stripe_payout=${status}`
  );
}

function onboardingRedirect(appUrl: string, step: string, status: string) {
  return NextResponse.redirect(
    `${appUrl}/onboarding?step=${encodeURIComponent(step)}&stripe=${encodeURIComponent(status)}`
  );
}

export async function GET(req: NextRequest) {
  const appUrl = getAppUrl();
  const flow = parseFlow(req);
  const user = await getSessionUser();

  if (!user?.stripe_account_id) {
    if (flow === "onboarding") {
      return onboardingRedirect(appUrl, "payment", "missing");
    }
    return settingsRedirect(appUrl, "missing");
  }

  try {
    const account = await retrieveConnectedAccount(user.stripe_account_id);
    const ready = await syncPayoutOnboardingStatus(user.stripe_account_id);
    const status = ready
      ? "ready"
      : classifyPayoutOnboardingStatus(account);

    if (flow === "onboarding") {
      if (status === "incomplete") {
        return onboardingRedirect(appUrl, "payment", "incomplete");
      }

      const userId = toIdString(user._id);
      if (userId) {
        await updateOnboardingProgress(userId, {
          configureBankAccount: true,
        });
        await refreshSession(userId);
      }

      return onboardingRedirect(appUrl, "username", status);
    }

    return settingsRedirect(appUrl, status);
  } catch {
    if (flow === "onboarding") {
      return onboardingRedirect(appUrl, "payment", "error");
    }
    return settingsRedirect(appUrl, "error");
  }
}
