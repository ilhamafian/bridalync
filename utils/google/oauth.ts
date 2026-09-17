import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAppUrl } from "@/utils/appUrl";

export const GOOGLE_OAUTH_COOKIE = "bridalync_google_oauth";
export const GOOGLE_CALENDAR_COOKIE = "bridalync_google_calendar";

export const GOOGLE_SIGNIN_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
] as const;

export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

export type GoogleOAuthIntent = "login" | "signup" | "calendar";

type OAuthCookiePayload = {
  nonce: string;
  verifier: string;
  intent: GoogleOAuthIntent;
  exp: number;
};

type CalendarTokenPayload = {
  accessToken: string;
  userId: string;
  exp: number;
};

const OAUTH_COOKIE_MAX_AGE_SECONDS = 60 * 10;
const CALENDAR_COOKIE_MAX_AGE_SECONDS = 60 * 50;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set");
  }
  return secret;
}

function encryptionKey() {
  return createHash("sha256").update(getAuthSecret()).digest();
}

function encryptJson(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptJson<T>(token: string): T | null {
  try {
    const buffer = Buffer.from(token, "base64url");
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set."
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${getAppUrl()}/api/auth/google/callback`,
  };
}

function toBase64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createCodeChallenge(verifier: string) {
  return toBase64Url(createHash("sha256").update(verifier).digest());
}

export function googleOAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function buildGoogleAuthUrl(intent: GoogleOAuthIntent) {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const nonce = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const scopes =
    intent === "calendar"
      ? [GOOGLE_CALENDAR_SCOPE]
      : [...GOOGLE_SIGNIN_SCOPES];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    state: nonce,
    code_challenge: createCodeChallenge(verifier),
    code_challenge_method: "S256",
    include_granted_scopes: "true",
    prompt:
      intent === "calendar" ? "select_account consent" : "select_account",
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    cookieValue: encryptJson({
      nonce,
      verifier,
      intent,
      exp: Date.now() + OAUTH_COOKIE_MAX_AGE_SECONDS * 1000,
    } satisfies OAuthCookiePayload),
  };
}

export function applyOAuthCookie(response: NextResponse, value: string) {
  response.cookies.set(
    GOOGLE_OAUTH_COOKIE,
    value,
    googleOAuthCookieOptions(OAUTH_COOKIE_MAX_AGE_SECONDS)
  );
}

export function clearOAuthCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_COOKIE, "", {
    ...googleOAuthCookieOptions(0),
    maxAge: 0,
  });
}

export async function readOAuthCookie(): Promise<OAuthCookiePayload | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(GOOGLE_OAUTH_COOKIE)?.value;
  if (!value) return null;

  const payload = decryptJson<OAuthCookiePayload>(value);
  if (!payload || payload.exp < Date.now()) return null;
  return payload;
}

export function applyCalendarTokenCookie(
  response: NextResponse,
  input: {
    accessToken: string;
    expiresInSeconds: number;
    userId: string;
  }
) {
  const maxAge = Math.max(
    60,
    Math.min(input.expiresInSeconds - 60, CALENDAR_COOKIE_MAX_AGE_SECONDS)
  );
  response.cookies.set(
    GOOGLE_CALENDAR_COOKIE,
    encryptJson({
      accessToken: input.accessToken,
      userId: input.userId,
      exp: Date.now() + maxAge * 1000,
    } satisfies CalendarTokenPayload),
    googleOAuthCookieOptions(maxAge)
  );
}

export function clearCalendarTokenCookie(response?: NextResponse) {
  const options = {
    ...googleOAuthCookieOptions(0),
    maxAge: 0,
  };
  if (response) {
    response.cookies.set(GOOGLE_CALENDAR_COOKIE, "", options);
    return;
  }
}

export async function clearGoogleConnectCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(GOOGLE_CALENDAR_COOKIE);
  cookieStore.delete(GOOGLE_OAUTH_COOKIE);
}

export async function getGoogleCalendarAccessToken(userId: string) {
  const cookieStore = await cookies();
  const value = cookieStore.get(GOOGLE_CALENDAR_COOKIE)?.value;
  if (!value) return null;

  const payload = decryptJson<CalendarTokenPayload>(value);
  if (
    !payload?.accessToken ||
    !payload.userId ||
    payload.userId !== userId ||
    payload.exp < Date.now()
  ) {
    return null;
  }
  return payload.accessToken;
}

export type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export async function exchangeGoogleCode(
  code: string,
  verifier: string
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Google token exchange failed:", errorBody);
    throw new Error("Google sign-in failed.");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
};

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not read Google account details.");
  }

  const profile = (await response.json()) as GoogleUserInfo;
  if (!profile.sub || !profile.email) {
    throw new Error("Google did not return an email address.");
  }

  return profile;
}

export function isGoogleEmailVerified(profile: GoogleUserInfo) {
  return profile.email_verified === true || profile.email_verified === "true";
}

export function authErrorRedirect(code: string) {
  return NextResponse.redirect(`${getAppUrl()}/auth?error=${code}`);
}

export function calendarRedirect(query: Record<string, string>) {
  const url = new URL(`${getAppUrl()}/dashboard/calendar`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}
