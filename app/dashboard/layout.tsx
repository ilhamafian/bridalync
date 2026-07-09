import { redirect } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { SiteHeader } from "@/components/site-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { getSessionUser } from "@/utils/auth/session";

export default async function DashboardLayout({
  children,
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

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col">
        <SiteHeader />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    </TooltipProvider>
  );
}
