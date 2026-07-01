import bcrypt from "bcryptjs";

import { UserModel } from "@/models/User";
import { userExists } from "@/utils/users";
import { publicUserSchema, type PublicUser } from "@/schemas/userSchema";

const PASSWORD_SALT_ROUNDS = 12;

export class AuthError extends Error {
  constructor(
    readonly code: "EMAIL_TAKEN" | "INVALID_CREDENTIALS",
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function deriveUsernameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "user";
  const slug = localPart.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return slug || "user";
}

function formatNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "User";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "User";
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

async function ensureUniqueUsername(baseUsername: string) {
  let username = baseUsername;
  let suffix = 0;

  while (await userExists(username)) {
    suffix += 1;
    username = `${baseUsername}${suffix}`;
  }

  return username;
}

export async function userEmailExists(email: string) {
  const doc = await new UserModel().findOne({
    email: normalizeEmail(email),
  } as never);
  return doc !== null;
}

export async function createPartialAccount(input: {
  email: string;
  password: string;
}): Promise<PublicUser> {
  const email = normalizeEmail(input.email);

  if (await userEmailExists(email)) {
    throw new AuthError(
      "EMAIL_TAKEN",
      "An account with this email already exists."
    );
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  const user = await new UserModel().create({
    email,
    password: passwordHash,
    onboarding_completed: false,
  });

  return publicUserSchema.parse(user);
}

export async function authenticateUser(input: {
  email: string;
  password: string;
}): Promise<PublicUser> {
  const email = normalizeEmail(input.email);
  const user = await new UserModel().findOne({ email } as never);

  if (!user) {
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.password
  );

  if (!passwordMatches) {
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  return publicUserSchema.parse(user);
}
