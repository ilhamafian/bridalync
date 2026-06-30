import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { UserModel } from "@/models/User";
import {
  publicUserSchema,
  type PublicUser,
} from "@/schemas/userSchema";
import { ObjectId } from "mongodb";

export const SESSION_COOKIE_NAME = "bridalync_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type SessionPayload = {
  userId: string;
  onboarding_completed: boolean;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.UI_KIT_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET or UI_KIT_SECRET must be set");
  }
  return secret;
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): SessionPayload | null {
  try {
    return JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as SessionPayload;
  } catch {
    return null;
  }
}

export function createSessionToken(input: {
  onboarding_completed: boolean;
  userId: string;
}) {
  const payload: SessionPayload = {
    onboarding_completed: input.onboarding_completed,
    userId: input.userId,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encoded = encodePayload(payload);
  const signature = createHmac("sha256", getAuthSecret())
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expectedSignature = createHmac("sha256", getAuthSecret())
    .update(encoded)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload || payload.exp < Date.now()) return null;

  return payload;
}

export async function setAuthSession(user: PublicUser) {
  const token = createSessionToken({
    onboarding_completed: user.onboarding_completed,
    userId: user._id ?? "",
  });
  if (!user._id) {
    throw new Error("User ID is required");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await new UserModel().findOne({ _id: payload.userId });
  if (!user) return null;

  const parsed = publicUserSchema.safeParse(user);
  return parsed.success ? parsed.data : null;
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
