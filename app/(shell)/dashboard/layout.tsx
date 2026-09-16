import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ProfilePreviewAside } from "@/components/dashboard/ProfilePreviewAside";
import { SiteHeader } from "@/components/site-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isOnboardingComplete, type SessionUser } from "@/schemas/userSchema";
import { buildProfilePreviewUrl, buildProfileUrl, getAppUrl } from "@/utils/appUrl";
import { getSessionUser } from "@/utils/auth/session";
import { loadDashboardData } from "@/utils/loadDashboardData";

async function DashboardContent({ user }: { user: SessionUser }) {
  const data = await loadDashboardData(user);
  if (!data) {
    redirect("/onboarding");
  }

  return <DashboardShell data={data} />;
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
  let profilePreviewUrl: string | null = null;
  if (username) {
    try {
      profilePreviewUrl = buildProfilePreviewUrl(
        buildProfileUrl(getAppUrl(), username)
      );
    } catch {
      profilePreviewUrl = buildProfilePreviewUrl(`/${username}`);
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col">
        <SiteHeader
          profilePreviewUrl={profilePreviewUrl}
          profileName={user.name}
          profilePhotoUrl={user.profile_photo_url}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <Suspense fallback={<DashboardSkeleton />}>
                <DashboardContent user={user} />
              </Suspense>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
      {profilePreviewUrl ? (
        <ProfilePreviewAside href={profilePreviewUrl} />
      ) : null}
    </TooltipProvider>
  );
}
