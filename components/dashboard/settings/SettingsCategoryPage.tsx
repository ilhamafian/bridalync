"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";

import { BackButton } from "@/components/dashboard/BackButton";
import { ClientInfoSettings } from "@/components/dashboard/settings/ClientInfoSettings";
import { getSettingsCategoryMeta } from "@/components/dashboard/settings/categories";
import { useStyleTerms } from "@/components/dashboard/StyleTermsProvider";
import { GoogleCalendarImport } from "@/components/dashboard/settings/GoogleCalendarImport";
import { ResetPasswordSettings } from "@/components/dashboard/settings/ResetPasswordSettings";
import { ThemeSettings } from "@/components/dashboard/settings/ThemeSettings";
import { PackagesManager } from "@/components/PackagesManager";
import { PwaSettingsCard } from "@/components/PwaSettingsCard";
import { SettingsManager } from "@/components/SettingsManager";
import { cn } from "@/lib/utils";
import { getTravelPricing } from "@/utils/booking/regions";
import { getCatalogEditorTarget } from "@/utils/dashboardShell";
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
  const styleTerms = useStyleTerms();
  const [chargeBy, setChargeBy] = useState(packages.chargeBy);
  const [travel, setTravel] = useState(settings.initialSettings.travel);
  const regionPricesPerEvent =
    chargeBy === "package" &&
    getTravelPricing(travel, chargeBy).kind === "region_per_event";
  const meta = category ? getSettingsCategoryMeta(category, styleTerms) : null;
  const isPackages = category === "events";
  const isCatalogEditor = getCatalogEditorTarget(usePathname()) !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 px-4 empty:hidden lg:px-6">
        {isCatalogEditor ? null : (
          <BackButton fallbackHref="/dashboard/settings" />
        )}
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
          initialShowAddOnPrices={packages.showAddOnPrices}
          chargeBy={chargeBy}
          regionPricesPerEvent={regionPricesPerEvent}
          styleTerms={styleTerms}
        />
      </div>

      <div className="px-4 empty:hidden lg:px-6">
        <Suspense fallback={null}>
          <SettingsManager
            category={category}
            initialSettings={settings.initialSettings}
            isStripeConnected={settings.isStripeConnected}
            hasStripeAccount={settings.hasStripeAccount}
            freelancerName={settings.freelancerName}
            onChargeByChange={setChargeBy}
            onTravelChange={setTravel}
          />
          {category === "google-calendar" ? <GoogleCalendarImport /> : null}
        </Suspense>
        {category === "theme" ? <ThemeSettings /> : null}
        {category === "notifications" ? <PwaSettingsCard /> : null}
        {category === "password" ? <ResetPasswordSettings email={email} /> : null}
      </div>

      <div className={cn("px-4 lg:px-6", category !== "client-info" && "hidden")}>
        <ClientInfoSettings
          initialClientInfo={settings.initialSettings.client_info}
        />
      </div>
    </div>
  );
}
