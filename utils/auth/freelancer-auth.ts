import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

import { freelancerModel } from "@/models/Freelancer";
import { freelancerExists } from "@/utils/freelancers";
import {
  publicFreelancerSchema,
  type PublicFreelancer,
} from "@/schemas/freelancer";

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

  while (await freelancerExists(username)) {
    suffix += 1;
    username = `${baseUsername}${suffix}`;
  }

  return username;
}

export async function freelancerEmailExists(email: string) {
  const doc = await freelancerModel.findOne({
    email: normalizeEmail(email),
  } as never);
  return doc !== null;
}

export async function createPartialAccount(input: {
  email: string;
  password: string;
}): Promise<PublicFreelancer> {
  const email = normalizeEmail(input.email);

  if (await freelancerEmailExists(email)) {
    throw new AuthError(
      "EMAIL_TAKEN",
      "An account with this email already exists."
    );
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  const freelancer = await freelancerModel.create({
    _id: new ObjectId(),
    email,
    password: passwordHash,
    onboarding_completed: false,
  });

  return publicFreelancerSchema.parse(freelancer);
}

export async function authenticateFreelancer(input: {
  email: string;
  password: string;
}): Promise<PublicFreelancer> {
  const email = normalizeEmail(input.email);
  const freelancer = await freelancerModel.findOne({ email } as never);

  if (!freelancer) {
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    freelancer.password
  );

  if (!passwordMatches) {
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  return publicFreelancerSchema.parse(freelancer);
}
