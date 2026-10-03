"use client";

import { Suspense, useCallback, useEffect, useState, Fragment } from "react";
import { usePathname } from "next/navigation";

import { BookingsManager } from "@/components/BookingsManager";
import { CalendarManager } from "@/components/calendar/CalendarManager";
import { BookingDetailsPage } from "@/components/dashboard/BookingDetailsPage";
import { BookingFormPage } from "@/components/dashboard/BookingFormPage";
import { useDashboardRefreshVersion } from "@/components/dashboard/DashboardRefresh";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { NotificationsPage } from "@/components/dashboard/NotificationsPage";
import { PackagesManager } from "@/components/PackagesManager";
import { ProfileManager } from "@/components/profile/ProfileManager";
import { ReviewsManager } from "@/components/profile/ReviewsManager";
import { SettingsManager } from "@/components/SettingsManager";
import { cn } from "@/lib/utils";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import {
  getBookingDetailsId,
  getBookingFormTarget,
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

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2 px-4 lg:px-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}

export function DashboardShell({ data }: { data: DashboardData }) {
  const pathname = usePathname();
  const active = getDashboardSection(pathname);
  const refreshVersion = useDashboardRefreshVersion();
  const [savedBookings, setSavedBookings] = useState<
    Record<string, SerializedBooking>
  >({});
  const bookingDetailsId = getBookingDetailsId(pathname);
  const bookingFormTarget = getBookingFormTarget(pathname);
  const bookingFormId =
    bookingFormTarget?.mode === "edit" ? bookingFormTarget.id : null;

  const findBooking = useCallback(
    (id: string | null) =>
      id
        ? (savedBookings[id] ??
          data.bookings.initialBookings.find((booking) => booking._id === id) ??
          null)
        : null,
    [savedBookings, data.bookings.initialBookings]
  );

  const handleBookingSaved = useCallback((saved: SerializedBooking) => {
    setSavedBookings((current) => ({ ...current, [saved._id]: saved }));
  }, []);

  useEffect(() => {
    document
      .querySelector<HTMLElement>("[data-dashboard-scroll]")
      ?.scrollTo({ top: 0 });
  }, [active, bookingDetailsId, bookingFormId]);

  return (
    <Fragment key={refreshVersion}>
      <Section id="home" active={active}>
        <DashboardHome {...data.home} />
      </Section>

      <Section id="analytics" active={active}>
        <PlaceholderPage title="Analytics" />
      </Section>

      <Section id="notifications" active={active}>
        <NotificationsPage bookings={data.bookings.initialBookings} />
      </Section>

      <Section id="blocked" active={active}>
        <PlaceholderPage title="Blocked dates & slots" />
      </Section>

      <Section id="hot-dates" active={active}>
        <PlaceholderPage title="Hot dates" />
      </Section>

      <Section id="booking-period" active={active}>
        <PlaceholderPage title="Booking period" />
      </Section>

      <Section id="bookings" active={active}>
        <Suspense fallback={null}>
          <BookingsManager initialBookings={data.bookings.initialBookings} />
        </Suspense>
      </Section>

      <Section id="booking-details" active={active}>
        {bookingDetailsId ? (
          <BookingDetailsPage booking={findBooking(bookingDetailsId)} />
        ) : null}
      </Section>

      <Section id="booking-form" active={active}>
        {bookingFormTarget ? (
          <BookingFormPage
            mode={bookingFormTarget.mode}
            booking={findBooking(bookingFormId)}
            catalog={{
              packages: data.bookings.packages,
              styles: data.bookings.styles,
              addOns: data.bookings.addOns,
              chargeBy: data.bookings.chargeBy,
              timeSlots: data.bookings.timeSlots,
            }}
            onSaved={handleBookingSaved}
          />
        ) : null}
      </Section>

      <Section id="packages" active={active}>
        <PackagesManager
          initialPackages={data.packages.initialPackages}
          initialStyles={data.packages.initialStyles}
          initialAddOns={data.packages.initialAddOns}
          chargeBy={data.packages.chargeBy}
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
