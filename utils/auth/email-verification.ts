import bcrypt from "bcryptjs";

import { emailVerificationModel } from "@/models/EmailVerification";
import { userEmailExists } from "@/utils/auth/user-auth";
import { sendEmail } from "@/utils/email/resend";

const CODE_SALT_ROUNDS = 10;
const CODE_TTL_MS = 10 * 60 * 1000;

export class EmailVerificationError extends Error {
  constructor(
    readonly code:
      | "EMAIL_TAKEN"
      | "INVALID_CODE"
      | "CODE_EXPIRED"
      | "NO_CODE"
      | "EMAIL_SEND_FAILED",
    message: string
  ) {
    super(message);
    this.name = "EmailVerificationError";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildVerificationEmail(code: string) {
  const text = `Your Bridalync verification code is ${code}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111;">
      <p>Your Bridalync verification code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
      <p>This code expires in 10 minutes.</p>
      <p style="color: #666;">If you did not request this, you can ignore this email.</p>
    </div>
  `.trim();

  return { text, html };
}

export async function sendVerificationCode(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (await userEmailExists(normalizedEmail)) {
    throw new EmailVerificationError(
      "EMAIL_TAKEN",
      "An account with this email already exists."
    );
  }

  const code = generateSixDigitCode();
  const codeHash = await bcrypt.hash(code, CODE_SALT_ROUNDS);
  const now = new Date();

  await emailVerificationModel.deleteByEmail(normalizedEmail);
  await emailVerificationModel.create({
    email: normalizedEmail,
    code_hash: codeHash,
    expires_at: new Date(now.getTime() + CODE_TTL_MS),
    created_at: now,
  });

  const { text, html } = buildVerificationEmail(code);

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "Your Bridalync verification code",
      html,
      text,
    });
  } catch (error) {
    await emailVerificationModel.deleteByEmail(normalizedEmail);
    throw new EmailVerificationError(
      "EMAIL_SEND_FAILED",
      error instanceof Error
        ? error.message
        : "Failed to send verification email. Please try again."
    );
  }

  if (process.env.DEV_MODE === "true") {
    console.log(
      `[email-verification] Sent code to ${normalizedEmail} (expires in 10 minutes)`
    );
  }
}

export async function verifyEmailCode(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const record = await emailVerificationModel.findOne({
    email: normalizedEmail,
  } as never);

  if (!record) {
    throw new EmailVerificationError(
      "NO_CODE",
      "No verification code found. Please request a new one."
    );
  }

  if (record.expires_at < new Date()) {
    await emailVerificationModel.deleteByEmail(normalizedEmail);
    throw new EmailVerificationError(
      "CODE_EXPIRED",
      "Verification code has expired. Please request a new one."
    );
  }

  const codeMatches = await bcrypt.compare(code, record.code_hash);
  if (!codeMatches) {
    throw new EmailVerificationError(
      "INVALID_CODE",
      "Invalid verification code."
    );
  }

  await emailVerificationModel.deleteByEmail(normalizedEmail);
}
