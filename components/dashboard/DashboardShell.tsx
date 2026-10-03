"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  Fragment,
} from "react";
import { usePathname } from "next/navigation";
import type { DateRange } from "react-day-picker";

import { BookingsManager } from "@/components/BookingsManager";
import { BlockDatesPage } from "@/components/dashboard/blocked/BlockDatesPage";
import {
  BlockedPage,
  type BlockedTab,
} from "@/components/dashboard/blocked/BlockedPage";
import { BlockSlotsPage } from "@/components/dashboard/blocked/BlockSlotsPage";
import { BookingDetailsPage } from "@/components/dashboard/BookingDetailsPage";
import { BookingFormPage } from "@/components/dashboard/BookingFormPage";
import { BookingPeriodPage } from "@/components/dashboard/BookingPeriodPage";
import { useDashboardRefreshVersion } from "@/components/dashboard/DashboardRefresh";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { AddHotDatesPage } from "@/components/dashboard/hot-dates/AddHotDatesPage";
import { HotDatesPage } from "@/components/dashboard/hot-dates/HotDatesPage";
import { NotificationsPage } from "@/components/dashboard/NotificationsPage";
import { PaymentsPage } from "@/components/dashboard/payments/PaymentsPage";
import { SettingsCategoryPage } from "@/components/dashboard/settings/SettingsCategoryPage";
import { SettingsPage } from "@/components/dashboard/settings/SettingsPage";
import { ProfileManager } from "@/components/profile/ProfileManager";
import { ReviewsManager } from "@/components/profile/ReviewsManager";
import { cn } from "@/lib/utils";
import { buildHotDateCatalog } from "@/utils/booking/hotDates";
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

export function DashboardShell({ data }: { data: DashboardData }) {
  const pathname = usePathname();
  const active = getDashboardSection(pathname);
  const refreshVersion = useDashboardRefreshVersion();
  const [savedBookings, setSavedBookings] = useState<
    Record<string, SerializedBooking>
  >({});
  const [reviews, setReviews] = useState(data.profile.initialReviews);
  const [blockedDates, setBlockedDates] = useState(data.blocked.dates);
  const [blockedSlots, setBlockedSlots] = useState(data.blocked.slots);
  const [blockedTab, setBlockedTab] = useState<BlockedTab>("dates");
  const [hotDates, setHotDates] = useState(data.hotDates);
  const [bookingUntil, setBookingUntil] = useState(data.bookingUntil);
  const [hotDateDraft, setHotDateDraft] = useState<{
    id: number;
    range?: DateRange;
  }>({ id: 0 });
  const hotDateCatalog = useMemo(
    () =>
      buildHotDateCatalog(
        data.bookings.chargeBy,
        data.bookings.packages,
        data.bookings.styles
      ),
    [data.bookings.chargeBy, data.bookings.packages, data.bookings.styles]
  );
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
        <BlockedPage
          dates={blockedDates}
          slots={blockedSlots}
          tab={blockedTab}
          onTabChange={setBlockedTab}
          onDatesChange={setBlockedDates}
          onSlotsChange={setBlockedSlots}
        />
      </Section>

      <Section id="block-dates" active={active}>
        <BlockDatesPage
          blockedDates={blockedDates}
          onBlockedDatesChange={(dates) => {
            setBlockedDates(dates);
            setBlockedTab("dates");
          }}
        />
      </Section>

      <Section id="block-slots" active={active}>
        <BlockSlotsPage
          timeSlots={data.bookings.timeSlots}
          bookings={data.bookings.initialBookings}
          blockedDates={blockedDates}
          blockedSlots={blockedSlots}
          onBlockedSlotsChange={(slots) => {
            setBlockedSlots(slots);
            setBlockedTab("slots");
          }}
        />
      </Section>

      <Section id="hot-dates" active={active}>
        <HotDatesPage
          hotDates={hotDates}
          catalog={hotDateCatalog}
          onHotDatesChange={setHotDates}
          onOpenDraft={(range) =>
            setHotDateDraft((current) => ({ id: current.id + 1, range }))
          }
        />
      </Section>

      <Section id="hot-dates-new" active={active}>
        <AddHotDatesPage
          key={hotDateDraft.id}
          hotDates={hotDates}
          catalog={hotDateCatalog}
          chargeBy={data.bookings.chargeBy}
          initialRange={hotDateDraft.range}
          onSaved={(next) => {
            setHotDates(next);
            setHotDateDraft((current) => ({ id: current.id + 1 }));
          }}
        />
      </Section>

      <Section id="booking-period" active={active}>
        <BookingPeriodPage
          bookingUntil={bookingUntil}
          onBookingUntilChange={setBookingUntil}
        />
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
