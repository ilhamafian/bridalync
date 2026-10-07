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
import { StyleTermsProvider } from "@/components/dashboard/StyleTermsProvider";
import { SettingsPage } from "@/components/dashboard/settings/SettingsPage";
import { ProfileManager } from "@/components/profile/ProfileManager";
import { useNotificationReads } from "@/components/dashboard/useNotificationReads";
import { ReviewsManager } from "@/components/profile/ReviewsManager";
import { cn } from "@/lib/utils";
import { getRecentActivity } from "@/utils/activity";
import { bookingSessionsOverlap } from "@/utils/booking/availability";
import { buildHotDateCatalog } from "@/utils/booking/hotDates";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import {
  getBookingDetailsId,
  getBookingFormTarget,
  getCatalogEditorTarget,
  getDashboardSection,
  getSettingsCategory,
  type DashboardData,
  type DashboardSection,
} from "@/utils/dashboardShell";

function firstSessionTime(booking: SerializedBooking) {
  const times = booking.sessions
    .map((session) => new Date(session.date).getTime())
    .filter((time) => !Number.isNaN(time));
  return times.length > 0 ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

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
    dates?: string[];
  }>({ id: 0 });
  const activity = useMemo(
    () => getRecentActivity(data.bookings.initialBookings),
    [data.bookings.initialBookings]
  );
  const notifications = useNotificationReads(activity, data.notifications);
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
  const catalogEditor = getCatalogEditorTarget(pathname);
  const catalogEditorKey = catalogEditor
    ? `${catalogEditor.type}:${catalogEditor.id ?? "new"}`
    : null;
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

  const handleRequestsDeclined = useCallback(
    (ids: string[]) => {
      const declinedAt = new Date().toISOString();
      setSavedBookings((current) => {
        const next = { ...current };
        for (const id of ids) {
          const booking =
            current[id] ??
            data.bookings.initialBookings.find((item) => item._id === id);
          if (booking) {
            next[id] = { ...booking, status: "cancelled", requestDeclinedAt: declinedAt };
          }
        }
        return next;
      });
    },
    [data.bookings.initialBookings]
  );

  const allBookings = data.bookings.initialBookings.map(
    (booking) => savedBookings[booking._id] ?? booking
  );
  const openRequests = allBookings.filter(
    (booking) => booking.status === "requested"
  );
  const findCompetingRequests = (booking: SerializedBooking) =>
    openRequests.filter(
      (other) =>
        other._id !== booking._id && bookingSessionsOverlap(other, booking)
    );

  const detailsBooking = findBooking(bookingDetailsId);
  const competingRequests =
    detailsBooking?.status === "requested"
      ? findCompetingRequests(detailsBooking)
      : [];

  const homeRequests =
    data.settings.initialSettings.booking_requests || openRequests.length > 0
      ? {
          total: openRequests.length,
          items: [...openRequests]
            .sort((a, b) => firstSessionTime(a) - firstSessionTime(b))
            .slice(0, 3)
            .map((booking) => ({
              booking,
              competingCount: findCompetingRequests(booking).length,
            })),
        }
      : null;

  useEffect(() => {
    document
      .querySelector<HTMLElement>("[data-dashboard-scroll]")
      ?.scrollTo({ top: 0 });
  }, [active, bookingDetailsId, bookingFormId, settingsCategory, catalogEditorKey]);

  return (
    <StyleTermsProvider role={data.profile.initialProfile.role}>
    <Fragment key={refreshVersion}>
      <Section id="home" active={active}>
        <DashboardHome
          {...data.home}
          requests={homeRequests}
          isActivityUnread={notifications.isUnread}
          onOpenActivity={notifications.markRead}
          onBookingUpdated={handleBookingSaved}
          onBookingsDeclined={handleRequestsDeclined}
        />
      </Section>

      <Section id="payments" active={active}>
        <PaymentsPage {...data.payments} />
      </Section>

      <Section id="notifications" active={active}>
        <NotificationsPage
          activity={activity}
          unreadCount={notifications.unreadCount}
          isUnread={notifications.isUnread}
          onOpen={notifications.markRead}
          onMarkAllRead={notifications.markAllRead}
        />
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
          onOpenDraft={(dates) =>
            setHotDateDraft((current) => ({ id: current.id + 1, dates }))
          }
        />
      </Section>

      <Section id="hot-dates-new" active={active}>
        <AddHotDatesPage
          key={hotDateDraft.id}
          hotDates={hotDates}
          catalog={hotDateCatalog}
          chargeBy={data.bookings.chargeBy}
          hotDateIsExtraCharge={
            data.bookings.travel?.kind === "region_per_event"
          }
          initialDates={hotDateDraft.dates}
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
          <BookingDetailsPage
            booking={detailsBooking}
            competingRequests={competingRequests}
            onBookingUpdated={handleBookingSaved}
            onBookingsDeclined={handleRequestsDeclined}
          />
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
              travel: data.bookings.travel,
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
          email={data.profile.initialProfile.email}
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
    </StyleTermsProvider>
  );
}
