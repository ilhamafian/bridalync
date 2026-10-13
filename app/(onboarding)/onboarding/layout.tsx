import { redirect } from "next/navigation";

import { isOnboardingComplete } from "@/schemas/userSchema";
import { getSessionUser } from "@/utils/auth/session";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth");
  }

  if (isOnboardingComplete(user.onboarding)) {
    redirect("/dashboard");
  }

  return children;
}
