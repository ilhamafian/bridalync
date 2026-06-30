import { redirect } from "next/navigation";

import { getSessionFreelancer } from "@/utils/auth/session";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const freelancer = await getSessionFreelancer();

  if (!freelancer) {
    redirect("/auth");
  }

  if (freelancer.onboarding_completed) {
    redirect("/");
  }

  return children;
}
