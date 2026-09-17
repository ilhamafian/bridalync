import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/utils/auth/session";
import { getAppUrl } from "@/utils/appUrl";
import {
  applyOAuthCookie,
  buildGoogleAuthUrl,
  type GoogleOAuthIntent,
} from "@/utils/google/oauth";

function parseIntent(value: string | null): GoogleOAuthIntent {
  if (value === "signup" || value === "calendar") return value;
  return "login";
}

export async function GET(req: NextRequest) {
  try {
    const intent = parseIntent(req.nextUrl.searchParams.get("intent"));

    if (intent === "calendar") {
      const user = await getSessionUser();
      if (!user) {
        return NextResponse.redirect(`${getAppUrl()}/auth`);
      }
    }

    const { url, cookieValue } = buildGoogleAuthUrl(intent);
    const response = NextResponse.redirect(url);
    applyOAuthCookie(response, cookieValue);
    return response;
  } catch (error) {
    console.error("Google OAuth start failed:", error);
    const intent = parseIntent(req.nextUrl.searchParams.get("intent"));
    if (intent === "calendar") {
      return NextResponse.redirect(
        `${getAppUrl()}/dashboard/calendar?google_error=config`
      );
    }
    return NextResponse.redirect(`${getAppUrl()}/auth?error=google_config`);
  }
}
