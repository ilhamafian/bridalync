"use client";

import { Suspense, useEffect, Fragment } from "react";
import { usePathname } from "next/navigation";

import { BookingsManager } from "@/components/BookingsManager";
import { CalendarManager } from "@/components/calendar/CalendarManager";
import { useDashboardRefreshVersion } from "@/components/dashboard/DashboardRefresh";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { PackagesManager } from "@/components/PackagesManager";
import { ProfileManager } from "@/components/profile/ProfileManager";
import { ReviewsManager } from "@/components/profile/ReviewsManager";
import { SettingsManager } from "@/components/SettingsManager";
import { cn } from "@/lib/utils";
import {
  getDashboardSection,
  type DashboardData,
  type DashboardSection,
} from "@/utils/dashboardShell";

function Section({
  id,
  active,
  children,
}: {
  id: DashboardSection;
  active: DashboardSection;
  children: React.ReactNode;
}) {
  const isActive = id === active;

  return (
    <div
      className={cn(!isActive && "hidden")}
      aria-hidden={!isActive}
      inert={!isActive ? true : undefined}
    >
      {children}
    </div>
  );
}

export function DashboardShell({ data }: { data: DashboardData }) {
  const pathname = usePathname();
  const active = getDashboardSection(pathname);
  const refreshVersion = useDashboardRefreshVersion();

  useEffect(() => {
    document
      .querySelector<HTMLElement>("[data-dashboard-scroll]")
      ?.scrollTo({ top: 0 });
  }, [active]);

  return (
    <Fragment key={refreshVersion}>
      <Section id="home" active={active}>
        <DashboardHome {...data.home} />
      </Section>

      <Section id="bookings" active={active}>
        <BookingsManager
          initialBookings={data.bookings.initialBookings}
          packages={data.bookings.packages}
          styles={data.bookings.styles}
          addOns={data.bookings.addOns}
          chargeBy={data.bookings.chargeBy}
          timeSlots={data.bookings.timeSlots}
        />
      </Section>

      <Section id="packages" active={active}>
        <PackagesManager
          initialPackages={data.packages.initialPackages}
          initialStyles={data.packages.initialStyles}
        />
      </Section>

      <Section id="calendar" active={active}>
        <CalendarManager
          initialBookings={data.bookings.initialBookings}
          chargeBy={data.packages.chargeBy}
          packages={data.packages.initialPackages}
          styles={data.packages.initialStyles}
          maxBookingYear={data.settings.initialSettings.max_booking_year}
        />
      </Section>

      <Section id="settings" active={active}>
        <Suspense fallback={null}>
          <SettingsManager
            initialSettings={data.settings.initialSettings}
            isStripeConnected={data.settings.isStripeConnected}
            hasStripeAccount={data.settings.hasStripeAccount}
          />
        </Suspense>
      </Section>

      <Section id="profile" active={active}>
        <div className="flex flex-col gap-6">
          <ProfileManager initialProfile={data.profile.initialProfile} />
          <div className="px-4 lg:px-6">
            <ReviewsManager initialReviews={data.profile.initialReviews} />
          </div>
        </div>
      </Section>
    </Fragment>
  );
}
