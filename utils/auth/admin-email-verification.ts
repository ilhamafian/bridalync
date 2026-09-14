import bcrypt from "bcryptjs";

import { emailVerificationModel } from "@/models/EmailVerification";
import { sendEmail } from "@/utils/email/resend";

const CODE_SALT_ROUNDS = 10;
const CODE_TTL_MS = 10 * 60 * 1000;

export class AdminEmailVerificationError extends Error {
  constructor(
    readonly code:
      | "INVALID_CODE"
      | "CODE_EXPIRED"
      | "NO_CODE"
      | "EMAIL_SEND_FAILED",
    message: string
  ) {
    super(message);
    this.name = "AdminEmailVerificationError";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function storageKey(email: string) {
  return `admin:${normalizeEmail(email)}`;
}

function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildAdminLoginEmail(code: string) {
  const text = `Your Bridalync admin sign-in code is ${code}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111;">
      <p>Your Bridalync admin sign-in code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
      <p>This code expires in 10 minutes.</p>
      <p style="color: #666;">If you did not try to sign in, change your admin password immediately.</p>
    </div>
  `.trim();

  return { text, html };
}

export async function sendAdminLoginCode(email: string) {
  const key = storageKey(email);
  const code = generateSixDigitCode();
  const codeHash = await bcrypt.hash(code, CODE_SALT_ROUNDS);
  const now = new Date();

  await emailVerificationModel.deleteByEmail(key);
  await emailVerificationModel.create({
    email: key,
    code_hash: codeHash,
    expires_at: new Date(now.getTime() + CODE_TTL_MS),
    created_at: now,
  });

  const normalizedEmail = normalizeEmail(email);
  const { text, html } = buildAdminLoginEmail(code);

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "Your Bridalync admin sign-in code",
      html,
      text,
    });
  } catch (error) {
    await emailVerificationModel.deleteByEmail(key);
    throw new AdminEmailVerificationError(
      "EMAIL_SEND_FAILED",
      error instanceof Error
        ? error.message
        : "Failed to send verification email. Please try again."
    );
  }

  if (process.env.DEV_MODE === "true") {
    console.log(
      `[admin-email-verification] Sent code to ${normalizedEmail} (expires in 10 minutes)`
    );
  }
}

export async function verifyAdminLoginCode(email: string, code: string) {
  const key = storageKey(email);
  const record = await emailVerificationModel.findOne({
    email: key,
  } as never);

  if (!record) {
    throw new AdminEmailVerificationError(
      "NO_CODE",
      "No verification code found. Please request a new one."
    );
  }

  if (record.expires_at < new Date()) {
    await emailVerificationModel.deleteByEmail(key);
    throw new AdminEmailVerificationError(
      "CODE_EXPIRED",
      "Verification code has expired. Please request a new one."
    );
  }

  const codeMatches = await bcrypt.compare(code, record.code_hash);
  if (!codeMatches) {
    throw new AdminEmailVerificationError(
      "INVALID_CODE",
      "Invalid verification code."
    );
  }

  await emailVerificationModel.deleteByEmail(key);
}
