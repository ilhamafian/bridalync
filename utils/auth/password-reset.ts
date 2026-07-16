import bcrypt from "bcryptjs";
import { ZodSchema } from "zod";
import { z } from "zod";

import { passwordResetModel } from "@/models/PasswordReset";
import { UserModel } from "@/models/User";
import { type User } from "@/schemas/userSchema";
import { sendEmail } from "@/utils/email/resend";

const CODE_SALT_ROUNDS = 10;
const CODE_TTL_MS = 10 * 60 * 1000;
const PASSWORD_SALT_ROUNDS = 12;

export class PasswordResetError extends Error {
  constructor(
    readonly code:
      | "INVALID_CODE"
      | "CODE_EXPIRED"
      | "NO_CODE"
      | "EMAIL_SEND_FAILED",
    message: string
  ) {
    super(message);
    this.name = "PasswordResetError";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildPasswordResetEmail(code: string) {
  const text = `Your Bridalync password reset code is ${code}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111;">
      <p>Your Bridalync password reset code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
      <p>This code expires in 10 minutes.</p>
      <p style="color: #666;">If you did not request this, you can ignore this email.</p>
    </div>
  `.trim();

  return { text, html };
}

export async function sendPasswordResetCode(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await new UserModel().findOne({ email: normalizedEmail } as never);

  if (!user) {
    if (process.env.DEV_MODE === "true") {
      console.log(
        `[password-reset] No account for ${normalizedEmail}, skipping send`
      );
    }
    return;
  }

  const code = generateSixDigitCode();
  const codeHash = await bcrypt.hash(code, CODE_SALT_ROUNDS);
  const now = new Date();

  await passwordResetModel.deleteByEmail(normalizedEmail);
  await passwordResetModel.create({
    email: normalizedEmail,
    code_hash: codeHash,
    expires_at: new Date(now.getTime() + CODE_TTL_MS),
    created_at: now,
  });

  const { text, html } = buildPasswordResetEmail(code);

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "Reset your Bridalync password",
      html,
      text,
    });
  } catch (error) {
    await passwordResetModel.deleteByEmail(normalizedEmail);
    throw new PasswordResetError(
      "EMAIL_SEND_FAILED",
      error instanceof Error
        ? error.message
        : "Failed to send reset email. Please try again."
    );
  }

  if (process.env.DEV_MODE === "true") {
    console.log(
      `[password-reset] Sent code to ${normalizedEmail} (expires in 10 minutes)`
    );
  }
}

export async function resetPasswordWithCode(input: {
  email: string;
  code: string;
  password: string;
}) {
  const normalizedEmail = normalizeEmail(input.email);
  const record = await passwordResetModel.findOne({
    email: normalizedEmail,
  } as never);

  if (!record) {
    throw new PasswordResetError(
      "NO_CODE",
      "No reset code found. Please request a new one."
    );
  }

  if (record.expires_at < new Date()) {
    await passwordResetModel.deleteByEmail(normalizedEmail);
    throw new PasswordResetError(
      "CODE_EXPIRED",
      "Reset code has expired. Please request a new one."
    );
  }

  const codeMatches = await bcrypt.compare(input.code, record.code_hash);
  if (!codeMatches) {
    throw new PasswordResetError("INVALID_CODE", "Invalid reset code.");
  }

  const user = await new UserModel().findOne({ email: normalizedEmail } as never);
  if (!user?._id) {
    await passwordResetModel.deleteByEmail(normalizedEmail);
    throw new PasswordResetError(
      "NO_CODE",
      "No reset code found. Please request a new one."
    );
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
  const passwordUpdateSchema = z.object({ password: z.string().min(1) });
  await new UserModel().update(
    String(user._id),
    { password: passwordHash },
    passwordUpdateSchema as ZodSchema<Partial<User>>
  );
  await passwordResetModel.deleteByEmail(normalizedEmail);
}
