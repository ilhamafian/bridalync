import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { z } from "zod";

import { adminModel } from "@/models/Admin";
import type { Admin } from "@/schemas/adminSchema";
import { toIdString } from "@/schemas/objectId";

export const ADMIN_SESSION_COOKIE_NAME = "bridalync_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_SALT_ROUNDS = 12;

/** Strip accidental quotes/whitespace from Vercel/env values. */
function normalizeEnvCredential(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

type AdminSessionPayload = {
  adminId: string;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set");
  }
  return secret;
}

function encodePayload(payload: AdminSessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): AdminSessionPayload | null {
  try {
    return JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as AdminSessionPayload;
  } catch {
    return null;
  }
}

export function createAdminSessionToken(adminId: string) {
  const payload: AdminSessionPayload = {
    adminId,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encoded = encodePayload(payload);
  const signature = createHmac("sha256", getAuthSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyAdminSessionToken(
  token: string
): AdminSessionPayload | null {
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

export async function setAdminSession(admin: Admin) {
  const adminId = toIdString(admin._id as never);
  if (!adminId) {
    throw new Error("Admin ID is required");
  }

  const token = createAdminSessionToken(adminId);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
}

export async function getSessionAdmin(): Promise<Admin | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyAdminSessionToken(token);
  if (!payload) return null;

  return adminModel.findById(payload.adminId);
}

async function ensureBootstrapAdmin() {
  const email = normalizeEnvCredential(process.env.ADMIN_EMAIL)?.toLowerCase();
  const password = normalizeEnvCredential(process.env.ADMIN_PASSWORD);
  if (!email || !password) {
    return null;
  }

  // Reject clearly bad env values before Zod dumps a JSON error message.
  const emailCheck = z.email().safeParse(email);
  if (!emailCheck.success) {
    throw new Error(
      "ADMIN_EMAIL is invalid. In Vercel, set it without quotes (e.g. you@domain.com)."
    );
  }

  const existing = await adminModel.findByEmail(email);
  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  return adminModel.create({
    email,
    passwordHash,
  } as Admin);
}

export async function authenticateAdmin(input: {
  email: string;
  password: string;
}): Promise<Admin> {
  await ensureBootstrapAdmin();

  const email = input.email.trim().toLowerCase();
  const admin = await adminModel.findByEmail(email);
  if (!admin) {
    throw new Error("Invalid email or password.");
  }

  const matches = await bcrypt.compare(input.password, admin.passwordHash);
  if (!matches) {
    throw new Error("Invalid email or password.");
  }

  return admin;
}
