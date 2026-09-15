import { NextResponse } from "next/server";

import { getSessionUser } from "@/utils/auth/session";
import { getAppUrl } from "@/utils/appUrl";
import {
  classifyPayoutOnboardingStatus,
  retrieveConnectedAccount,
  syncPayoutOnboardingStatus,
} from "@/utils/stripe/connect";

function settingsRedirect(appUrl: string, status: string) {
  return NextResponse.redirect(
    `${appUrl}/dashboard/settings?stripe_payout=${status}`
  );
}

export async function GET() {
  const appUrl = getAppUrl();
  const user = await getSessionUser();

  if (!user?.stripe_account_id) {
    return settingsRedirect(appUrl, "missing");
  }

  try {
    const account = await retrieveConnectedAccount(user.stripe_account_id);
    const ready = await syncPayoutOnboardingStatus(user.stripe_account_id);

    if (ready) {
      return settingsRedirect(appUrl, "ready");
    }

    return settingsRedirect(appUrl, classifyPayoutOnboardingStatus(account));
  } catch {
    return settingsRedirect(appUrl, "error");
  }
}
