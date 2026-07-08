import { NextResponse } from "next/server";

import { getSessionUser } from "@/utils/auth/session";
import { getAppUrl } from "@/utils/appUrl";
import {
  retrieveConnectedAccount,
  syncPayoutOnboardingStatus,
} from "@/utils/stripe/connect";

export async function GET() {
  const appUrl = getAppUrl();
  const user = await getSessionUser();

  if (!user?.stripe_account_id) {
    return NextResponse.redirect(`${appUrl}/dashboard?stripe_payout=missing`);
  }

  try {
    await retrieveConnectedAccount(user.stripe_account_id);
    const ready = await syncPayoutOnboardingStatus(user.stripe_account_id);

    if (ready) {
      return NextResponse.redirect(`${appUrl}/dashboard?stripe_payout=ready`);
    }

    return NextResponse.redirect(`${appUrl}/dashboard?stripe_payout=pending`);
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?stripe_payout=error`);
  }
}
