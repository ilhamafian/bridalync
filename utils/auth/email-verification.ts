import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

import { emailVerificationModel } from "@/models/EmailVerification";
import { userEmailExists } from "@/utils/auth/user-auth";

const CODE_SALT_ROUNDS = 10;
const CODE_TTL_MS = 10 * 60 * 1000;

export class EmailVerificationError extends Error {
  constructor(
    readonly code:
      | "EMAIL_TAKEN"
      | "INVALID_CODE"
      | "CODE_EXPIRED"
      | "NO_CODE",
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
    _id: new ObjectId(),
    email: normalizedEmail,
    code_hash: codeHash,
    expires_at: new Date(now.getTime() + CODE_TTL_MS),
    created_at: now,
  });

  console.log(
    `[email-verification] Code for ${normalizedEmail}: ${code} (expires in 10 minutes)`
  );
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
