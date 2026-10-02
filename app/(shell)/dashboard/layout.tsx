import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AnimatedFlow } from "@/components/animated-flow";
import { BottomNav } from "@/components/bottom-nav";
import { DashboardScrollArea } from "@/components/dashboard/DashboardRefresh";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ProfilePreviewAside } from "@/components/dashboard/ProfilePreviewAside";
import { SiteHeader } from "@/components/site-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isOnboardingComplete, type SessionUser } from "@/schemas/userSchema";
import { buildProfilePreviewUrl, buildProfileUrl, getAppUrl } from "@/utils/appUrl";
import { getSessionUser } from "@/utils/auth/session";
import { loadDashboardData } from "@/utils/loadDashboardData";

export const dynamic = "force-dynamic";

async function DashboardContent({ user }: { user: SessionUser }) {
  const data = await loadDashboardData(user);
  if (!data) {
    redirect("/onboarding");
  }

  return <DashboardShell key={Date.now()} data={data} />;
}

export default async function DashboardLayout({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth");
  }

  if (!isOnboardingComplete(user.onboarding)) {
    redirect("/onboarding");
  }

  const username = user.username?.trim() ?? "";
  let profileUrl: string | null = null;
  let profilePreviewUrl: string | null = null;
  if (username) {
    try {
      profileUrl = buildProfileUrl(getAppUrl(), username);
      profilePreviewUrl = buildProfilePreviewUrl(profileUrl);
    } catch {
      profilePreviewUrl = buildProfilePreviewUrl(`/${username}`);
    }
  }

  return (
    <TooltipProvider>
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
        <AnimatedFlow
          variant="blush"
          flowSpeed={0.9}
          distortionWarp={1.4}
          filmGrain={0.25}
          rotationAngle={120}
          className="pointer-events-none absolute inset-0 min-h-0"
        />
        <SiteHeader />
        <DashboardScrollArea>
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 pt-4 pb-28 md:gap-6 md:pt-6">
              <Suspense fallback={<DashboardSkeleton />}>
                <DashboardContent user={user} />
              </Suspense>
            </div>
          </div>
        </DashboardScrollArea>
        <BottomNav profileUrl={profileUrl} />
      </div>
      {profilePreviewUrl ? (
        <ProfilePreviewAside href={profilePreviewUrl} />
      ) : null}
    </TooltipProvider>
  );
}
