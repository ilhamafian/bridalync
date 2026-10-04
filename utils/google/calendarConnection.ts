import { googleCalendarConnectionModel } from "@/models/GoogleCalendarConnection";
import {
  decryptJson,
  encryptJson,
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_CALENDAR_READ_SCOPE,
  GoogleRefreshRevokedError,
  refreshGoogleAccessToken,
  revokeGoogleToken,
  type GoogleTokenResponse,
} from "@/utils/google/oauth";

/** Refresh a little early so a token never expires mid-request. */
const EXPIRY_MARGIN_MS = 2 * 60 * 1000;

type TokenPayload = { token: string };

function sealToken(token: string) {
  return encryptJson({ token } satisfies TokenPayload);
}

function openToken(value: string | undefined) {
  if (!value) return null;
  return decryptJson<TokenPayload>(value)?.token ?? null;
}

function expiresAt(tokens: GoogleTokenResponse) {
  return new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);
}

export type GoogleCalendarStatus = {
  connected: boolean;
  email: string | null;
  canImport: boolean;
  canSync: boolean;
};

async function fetchPrimaryCalendarEmail(accessToken: string) {
  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { id?: string };
    return data.id?.includes("@") ? data.id : null;
  } catch {
    return null;
  }
}

/** Stores the tokens from a fresh consent; returns false when Google sent no refresh token. */
export async function saveGoogleCalendarConnection(
  userId: string,
  tokens: GoogleTokenResponse
) {
  const existing = await googleCalendarConnectionModel.findByUserId(userId);
  const refreshToken =
    tokens.refresh_token ?? openToken(existing?.refresh_token_enc) ?? null;
  if (!refreshToken) return false;

  const email = await fetchPrimaryCalendarEmail(tokens.access_token);

  await googleCalendarConnectionModel.upsertForUser(userId, {
    google_email: email,
    refresh_token_enc: sealToken(refreshToken),
    access_token_enc: sealToken(tokens.access_token),
    access_token_expires_at: expiresAt(tokens),
    scopes: (tokens.scope ?? "").split(" ").filter(Boolean),
  });
  return true;
}

export async function getGoogleCalendarStatus(
  userId: string
): Promise<GoogleCalendarStatus> {
  const connection = await googleCalendarConnectionModel.findByUserId(userId);
  if (!connection) {
    return { connected: false, email: null, canImport: false, canSync: false };
  }
  return {
    connected: true,
    email: connection.google_email ?? null,
    canImport: connection.scopes.includes(GOOGLE_CALENDAR_READ_SCOPE),
    canSync: connection.scopes.includes(GOOGLE_CALENDAR_EVENTS_SCOPE),
  };
}

/**
 * A valid access token for the user's Google Calendar, refreshing it if needed.
 * Null when not connected or the user revoked access (the connection is then removed).
 */
export async function getGoogleCalendarAccessToken(
  userId: string,
  requiredScope?: string
): Promise<string | null> {
  const connection = await googleCalendarConnectionModel.findByUserId(userId);
  if (!connection) return null;
  if (requiredScope && !connection.scopes.includes(requiredScope)) return null;

  const cached = openToken(connection.access_token_enc);
  if (
    cached &&
    connection.access_token_expires_at &&
    connection.access_token_expires_at.getTime() - EXPIRY_MARGIN_MS > Date.now()
  ) {
    return cached;
  }

  const refreshToken = openToken(connection.refresh_token_enc);
  if (!refreshToken) {
    await googleCalendarConnectionModel.deleteByUserId(userId);
    return null;
  }

  try {
    const tokens = await refreshGoogleAccessToken(refreshToken);
    await googleCalendarConnectionModel.updateTokens(userId, {
      access_token_enc: sealToken(tokens.access_token),
      access_token_expires_at: expiresAt(tokens),
      ...(tokens.refresh_token
        ? { refresh_token_enc: sealToken(tokens.refresh_token) }
        : {}),
    });
    return tokens.access_token;
  } catch (error) {
    if (error instanceof GoogleRefreshRevokedError) {
      await googleCalendarConnectionModel.deleteByUserId(userId);
      return null;
    }
    throw error;
  }
}

/** Forget the stored access token so the next call refreshes (after a 401 from Google). */
export async function invalidateGoogleAccessToken(userId: string) {
  await googleCalendarConnectionModel.updateTokens(userId, {
    access_token_enc: undefined,
    access_token_expires_at: new Date(0),
  });
}

export async function disconnectGoogleCalendar(userId: string) {
  const connection = await googleCalendarConnectionModel.findByUserId(userId);
  if (!connection) return;

  const refreshToken = openToken(connection.refresh_token_enc);
  await googleCalendarConnectionModel.deleteByUserId(userId);
  if (refreshToken) await revokeGoogleToken(refreshToken);
}
