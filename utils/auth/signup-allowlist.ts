import { betaAllowlistModel } from "@/models/BetaAllowlist";

export async function isSignupEmailAllowed(email: string): Promise<boolean> {
  return betaAllowlistModel.isEmailAllowed(email);
}
