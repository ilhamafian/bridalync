import { UserModel } from "@/models/User";
import { isOnboardingComplete } from "@/schemas/onboardingSchema";

export async function freelancerExists(username: string) {
  const user = await new UserModel().findByUsername(username);
  return Boolean(user?._id && isOnboardingComplete(user.onboarding));
}

export async function getFreelancerByUsername(username: string) {
  const user = await new UserModel().findByUsername(username);
  if (!user?._id || !isOnboardingComplete(user.onboarding)) {
    return null;
  }
  return user;
}
