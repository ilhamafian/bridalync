import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { bookingModel } from "@/models/Booking";
import { PackageModel } from "@/models/Package";
import { SettingModel } from "@/models/Setting";
import { toIdString } from "@/schemas/objectId";
import { getDefaultTimeSlots } from "@/schemas/settingSchema";
import {
  buildProfileUrl,
  getAppUrl,
} from "@/utils/appUrl";
import { getSessionUser } from "@/utils/auth/session";
import { serializeBooking } from "@/utils/booking/serializeBooking";
import {
  countUpcomingThisWeek,
  flattenScheduleItems,
  getBookingSummary,
  getFirstName,
  getGreeting,
  getNextUpcomingBooking,
  getOutstandingPayments,
  getRecentActivity,
  getSetupChecklist,
  getTodaysSchedule,
} from "@/utils/dashboard";

export default async function DashboardPage() {
  const user = await getSessionUser();
  // Layout already gates auth + onboarding; keep a safe fallback.
  if (!user) {
    return null;
  }

  const userId = toIdString(user._id);
  if (!userId) {
    return null;
  }

  const [bookings, packages, settings] = await Promise.all([
    bookingModel.find({ freelancerUserId: userId }, { sort: { created_at: -1 } }),
    new PackageModel().find({ user_id: userId }, { sort: { order: 1 } }),
    new SettingModel().findSettingsByUserId(userId),
  ]);

  const serialized = bookings.map(serializeBooking);
  const now = new Date();
  const scheduleItems = flattenScheduleItems(serialized, now);
  const todaysSchedule = getTodaysSchedule(scheduleItems, now);
  const nextUpcoming = getNextUpcomingBooking(scheduleItems, now);
  const summary = getBookingSummary(scheduleItems, now);
  const outstanding = getOutstandingPayments(serialized);
  const activity = getRecentActivity(serialized, 5);
  const upcomingThisWeek = countUpcomingThisWeek(scheduleItems, now);

  const timeSlotCount =
    settings?.time_slots?.length ??
    getDefaultTimeSlots(settings?.charge_by ?? "package").length;

  const checklist = getSetupChecklist({
    packageCount: packages.length,
    timeSlotCount,
    isStripeConnected: Boolean(user.is_stripe_connected),
    hasUsername: Boolean(user.username?.trim()),
  });

  let bookingLink = "";
  if (user.username) {
    try {
      bookingLink = buildProfileUrl(getAppUrl(), user.username);
    } catch {
      bookingLink = `/${user.username}`;
    }
  }

  return (
    <DashboardHome
      greeting={getGreeting(now)}
      firstName={getFirstName(user.name)}
      upcomingThisWeek={upcomingThisWeek}
      todaysSchedule={todaysSchedule}
      nextUpcoming={nextUpcoming}
      summary={summary}
      outstanding={outstanding}
      activity={activity}
      checklist={checklist}
      bookingLink={bookingLink}
    />
  );
}
