import { NextRequest, NextResponse } from "next/server";

import { applyAuthSessionCookie, getSessionUser } from "@/utils/auth/session";
import { toIdString } from "@/schemas/objectId";
import {
  authenticateGoogleProfile,
  GoogleAuthError,
  googleAuthRedirectPath,
} from "@/utils/auth/google-auth";
import { getAppUrl } from "@/utils/appUrl";
import {
  applyCalendarTokenCookie,
  authErrorRedirect,
  calendarRedirect,
  clearOAuthCookie,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  isGoogleEmailVerified,
  readOAuthCookie,
} from "@/utils/google/oauth";

export async function GET(req: NextRequest) {
  const errorParam = req.nextUrl.searchParams.get("error");
  if (errorParam) {
    const denied = errorParam === "access_denied";
    const oauth = await readOAuthCookie();
    const response =
      oauth?.intent === "calendar"
        ? calendarRedirect({
            google_error: denied ? "denied" : "failed",
          })
        : authErrorRedirect(denied ? "google_denied" : "google_failed");
    clearOAuthCookie(response);
    return response;
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauth = await readOAuthCookie();

  if (!code || !state || !oauth || oauth.nonce !== state) {
    const response = authErrorRedirect("google_failed");
    clearOAuthCookie(response);
    return response;
  }

  try {
    const tokens = await exchangeGoogleCode(code, oauth.verifier);

    if (oauth.intent === "calendar") {
      const user = await getSessionUser();
      const userId = user ? toIdString(user._id) : "";
      if (!user || !userId) {
        const response = NextResponse.redirect(`${getAppUrl()}/auth`);
        clearOAuthCookie(response);
        return response;
      }
      if (!tokens.access_token) {
        const response = calendarRedirect({ google_error: "failed" });
        clearOAuthCookie(response);
        return response;
      }

      const response = calendarRedirect({ google: "connected" });
      clearOAuthCookie(response);
      applyCalendarTokenCookie(response, {
        accessToken: tokens.access_token,
        expiresInSeconds: tokens.expires_in ?? 3600,
        userId,
      });
      return response;
    }

    const profile = await fetchGoogleUserInfo(tokens.access_token);
    if (!isGoogleEmailVerified(profile)) {
      const response = authErrorRedirect("google_email");
      clearOAuthCookie(response);
      return response;
    }

    const user = await authenticateGoogleProfile(
      profile,
      oauth.intent === "signup" ? "signup" : "login"
    );

    const response = NextResponse.redirect(
      `${getAppUrl()}${googleAuthRedirectPath(user)}`
    );
    clearOAuthCookie(response);
    applyAuthSessionCookie(response, user);
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed:", error);

    if (error instanceof GoogleAuthError) {
      const codeByError = {
        BETA_NOT_ALLOWED: "google_beta",
        SIGNUP_DISABLED: "google_signup",
        EMAIL_UNVERIFIED: "google_email",
        ACCOUNT_CONFLICT: "google_conflict",
      } as const;
      const response = authErrorRedirect(codeByError[error.code]);
      clearOAuthCookie(response);
      return response;
    }

    const response =
      oauth.intent === "calendar"
        ? calendarRedirect({ google_error: "failed" })
        : authErrorRedirect("google_failed");
    clearOAuthCookie(response);
    return response;
  }
}
