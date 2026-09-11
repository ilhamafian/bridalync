import { betaAllowlistModel } from "@/models/BetaAllowlist";

/** Closed beta: signup UI is open; access is gated by `beta_allowlist`. */
export const SIGNUP_ENABLED = true;

export const BETA_NOT_ALLOWED_CODE = "BETA_NOT_ALLOWED" as const;

export const BETA_NOT_ALLOWED_MESSAGE =
  "This email isn't approved for closed beta yet. Join the waitlist and we'll reach out when a spot opens.";

export async function isSignupEmailAllowed(email: string): Promise<boolean> {
  return betaAllowlistModel.isEmailAllowed(email);
}
