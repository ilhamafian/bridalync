import { redirect } from "next/navigation";

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

  if (user.onboarding_completed) {
    redirect("/");
  }

  return children;
}
