"use client";

import { Suspense, useCallback, useEffect, useState, Fragment } from "react";
import { usePathname } from "next/navigation";

import { BookingsManager } from "@/components/BookingsManager";
import { CalendarManager } from "@/components/calendar/CalendarManager";
import { BackButton } from "@/components/dashboard/BackButton";
import { BlockedPage } from "@/components/dashboard/blocked/BlockedPage";
import { BookingDetailsPage } from "@/components/dashboard/BookingDetailsPage";
import { BookingFormPage } from "@/components/dashboard/BookingFormPage";
import { useDashboardRefreshVersion } from "@/components/dashboard/DashboardRefresh";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { NotificationsPage } from "@/components/dashboard/NotificationsPage";
import { PaymentsPage } from "@/components/dashboard/payments/PaymentsPage";
import { SettingsCategoryPage } from "@/components/dashboard/settings/SettingsCategoryPage";
import { SettingsPage } from "@/components/dashboard/settings/SettingsPage";
import { ProfileManager } from "@/components/profile/ProfileManager";
import { ReviewsManager } from "@/components/profile/ReviewsManager";
import { cn } from "@/lib/utils";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import {
  getBookingDetailsId,
  getBookingFormTarget,
  getDashboardSection,
  getSettingsCategory,
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

function PlaceholderPage({
  title,
  backHref,
}: {
  title: string;
  backHref?: string;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 lg:px-6">
      {backHref ? <BackButton fallbackHref={backHref} /> : null}
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
  const [reviews, setReviews] = useState(data.profile.initialReviews);
  const bookingDetailsId = getBookingDetailsId(pathname);
  const bookingFormTarget = getBookingFormTarget(pathname);
  const settingsCategory = getSettingsCategory(pathname);
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
  }, [active, bookingDetailsId, bookingFormId, settingsCategory]);

  return (
    <Fragment key={refreshVersion}>
      <Section id="home" active={active}>
        <DashboardHome {...data.home} />
      </Section>

      <Section id="payments" active={active}>
        <PaymentsPage {...data.payments} />
      </Section>

      <Section id="notifications" active={active}>
        <NotificationsPage bookings={data.bookings.initialBookings} />
      </Section>

      <Section id="blocked" active={active}>
        <BlockedPage dates={data.blocked.dates} />
      </Section>

      <Section id="block-dates" active={active}>
        <PlaceholderPage title="Block dates" backHref="/dashboard/blocked" />
      </Section>

      <Section id="block-slots" active={active}>
        <PlaceholderPage title="Block slots" backHref="/dashboard/blocked" />
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
        <SettingsPage />
      </Section>

      <Section id="settings-category" active={active}>
        <SettingsCategoryPage
          category={settingsCategory}
          settings={data.settings}
          packages={data.packages}
        />
      </Section>

      <Section id="profile" active={active}>
        <ProfileManager
          initialProfile={data.profile.initialProfile}
          appUrl={data.profile.appUrl}
          reviewCount={reviews.length}
        />
      </Section>

      <Section id="profile-reviews" active={active}>
        <ReviewsManager reviews={reviews} onReviewsChange={setReviews} />
      </Section>
    </Fragment>
  );
}
