import { NextResponse } from "next/server";

import { getSessionUser } from "@/utils/auth/session";
import { getAppUrl } from "@/utils/appUrl";
import { toIdString } from "@/schemas/objectId";
import {
  buildStripeOwner,
  createOnboardingAccountLink,
  ensureStripeAccountId,
} from "@/utils/stripe/connect";

export async function GET() {
  const appUrl = getAppUrl();
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
    const accountLink = await createOnboardingAccountLink(accountId);

    if (!accountLink.url) {
      return NextResponse.redirect(`${appUrl}/dashboard?stripe_payout=error`);
    }

    return NextResponse.redirect(accountLink.url);
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?stripe_payout=error`);
  }
}
