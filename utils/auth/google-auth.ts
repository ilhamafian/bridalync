import { UserModel } from "@/models/User";
import {
  isOnboardingComplete,
  sessionUserSchema,
  userSchema,
  type SessionUser,
} from "@/schemas/userSchema";
import { toIdString } from "@/schemas/objectId";
import { isSignupEmailAllowed } from "@/utils/auth/signup-allowlist";
import { SIGNUP_ENABLED } from "@/utils/auth/signup";
import type { GoogleUserInfo } from "@/utils/google/oauth";

export class GoogleAuthError extends Error {
  constructor(
    readonly code:
      | "EMAIL_UNVERIFIED"
      | "SIGNUP_DISABLED"
      | "BETA_NOT_ALLOWED"
      | "ACCOUNT_CONFLICT",
    message: string
  ) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function authenticateGoogleProfile(
  profile: GoogleUserInfo,
  intent: "login" | "signup"
): Promise<SessionUser> {
  const email = normalizeEmail(profile.email);
  const userModel = new UserModel();

  const existingByGoogle = await userModel.findOne({
    google_id: profile.sub,
  } as never);
  if (existingByGoogle) {
    return sessionUserSchema.parse(existingByGoogle);
  }

  const existingByEmail = await userModel.findOne({ email } as never);
  if (existingByEmail) {
    if (
      existingByEmail.google_id &&
      existingByEmail.google_id !== profile.sub
    ) {
      throw new GoogleAuthError(
        "ACCOUNT_CONFLICT",
        "This email is already linked to a different Google account."
      );
    }

    const userId = toIdString(existingByEmail._id);
    if (!userId) {
      throw new GoogleAuthError(
        "ACCOUNT_CONFLICT",
        "Could not link this Google account."
      );
    }

    await userModel.update(
      userId,
      {
        google_id: profile.sub,
        ...(existingByEmail.name || !profile.name
          ? {}
          : { name: profile.name.trim() }),
        ...(existingByEmail.profile_photo_url || !profile.picture
          ? {}
          : { profile_photo_url: profile.picture }),
      },
      userSchema.partial()
    );

    const linked = await userModel.findById(userId);
    if (!linked) {
      throw new GoogleAuthError(
        "ACCOUNT_CONFLICT",
        "Could not link this Google account."
      );
    }

    return sessionUserSchema.parse(linked);
  }

  if (!SIGNUP_ENABLED && intent === "signup") {
    throw new GoogleAuthError(
      "SIGNUP_DISABLED",
      "Signup is invite-only during closed beta. Join the waitlist and we'll reach out."
    );
  }

  if (!SIGNUP_ENABLED) {
    throw new GoogleAuthError(
      "SIGNUP_DISABLED",
      "No Bridalync account exists for this Google email. Join the waitlist and we'll reach out."
    );
  }

  const allowed = await isSignupEmailAllowed(email);
  if (!allowed) {
    throw new GoogleAuthError(
      "BETA_NOT_ALLOWED",
      "This email isn't approved for closed beta yet. Join the waitlist and we'll reach out when a spot opens."
    );
  }

  const created = await userModel.create(
    userSchema.parse({
      email,
      google_id: profile.sub,
      ...(profile.name?.trim() ? { name: profile.name.trim() } : {}),
      ...(profile.picture ? { profile_photo_url: profile.picture } : {}),
    })
  );

  return sessionUserSchema.parse(created);
}

export function googleAuthRedirectPath(user: SessionUser) {
  return isOnboardingComplete(user.onboarding) ? "/dashboard" : "/onboarding";
}
