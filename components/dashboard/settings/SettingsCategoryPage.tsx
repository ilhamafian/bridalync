"use client";

import { Suspense, useState } from "react";

import { BackButton } from "@/components/dashboard/BackButton";
import { SETTINGS_CATEGORY_META } from "@/components/dashboard/settings/categories";
import { GoogleCalendarImport } from "@/components/dashboard/settings/GoogleCalendarImport";
import { ResetPasswordSettings } from "@/components/dashboard/settings/ResetPasswordSettings";
import { ThemeSettings } from "@/components/dashboard/settings/ThemeSettings";
import { PackagesManager } from "@/components/PackagesManager";
import { PwaSettingsCard } from "@/components/PwaSettingsCard";
import { SettingsManager } from "@/components/SettingsManager";
import { cn } from "@/lib/utils";
import type {
  DashboardData,
  SettingsCategory,
} from "@/utils/dashboardShell";

/**
 * Settings and packages state lives here for the whole session (the managers
 * don't refresh server data after saving), so both stay mounted across
 * categories and only the active one is shown.
 */
export function SettingsCategoryPage({
  category,
  settings,
  packages,
  email,
}: {
  category: SettingsCategory | null;
  settings: DashboardData["settings"];
  packages: DashboardData["packages"];
  email: string;
}) {
  const [chargeBy, setChargeBy] = useState(packages.chargeBy);
  const meta = category ? SETTINGS_CATEGORY_META[category] : null;
  const isPackages = category === "events";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <BackButton fallbackHref="/dashboard/settings" />
        {meta && !isPackages ? (
          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              {meta.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {meta.description}
            </p>
          </section>
        ) : null}
      </div>

      <div className={cn(!isPackages && "hidden")}>
        <PackagesManager
          initialPackages={packages.initialPackages}
          initialStyles={packages.initialStyles}
          initialAddOns={packages.initialAddOns}
          chargeBy={chargeBy}
        />
      </div>

      <div className="px-4 empty:hidden lg:px-6">
        <Suspense fallback={null}>
          <SettingsManager
            category={category}
            initialSettings={settings.initialSettings}
            isStripeConnected={settings.isStripeConnected}
            hasStripeAccount={settings.hasStripeAccount}
            onChargeByChange={setChargeBy}
          />
          {category === "google-calendar" ? <GoogleCalendarImport /> : null}
        </Suspense>
        {category === "theme" ? <ThemeSettings /> : null}
        {category === "notifications" ? <PwaSettingsCard /> : null}
        {category === "password" ? <ResetPasswordSettings email={email} /> : null}
      </div>
    </div>
  );
}
