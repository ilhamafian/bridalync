import { WithId } from "mongodb";

import type { PackageItem, StyleItem } from "@/components/PackagesManager";
import { AddOnModel } from "@/models/AddOn";
import { bookingModel } from "@/models/Booking";
import { PackageModel } from "@/models/Package";
import { reviewModel } from "@/models/Review";
import { SettingModel } from "@/models/Setting";
import { StyleModel } from "@/models/Style";
import type { Package } from "@/schemas/packageSchema";
import { toIdString } from "@/schemas/objectId";
import { toDashboardReview } from "@/schemas/reviewSchema";
import {
  getDefaultTimeSlots,
  invoiceSettingSchema,
  paymentSettingSchema,
  type TimeSlot,
} from "@/schemas/settingSchema";
import type { Style } from "@/schemas/styleSchema";
import type { SessionUser } from "@/schemas/userSchema";
import { buildProfileUrl, getAppUrl } from "@/utils/appUrl";
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
import type { DashboardData } from "@/utils/dashboardShell";

function serializePackage(pkg: WithId<Package>): PackageItem {
  return {
    _id: toIdString(pkg._id),
    name: pkg.name,
    price: pkg.price,
    deposit: pkg.deposit,
    order: pkg.order,
  };
}

function serializeStyle(style: WithId<Style>): StyleItem {
  return {
    _id: toIdString(style._id),
    name: style.name,
    order: style.order,
    variants: style.variants,
  };
}

export async function loadDashboardData(
  user: SessionUser
): Promise<DashboardData | null> {
  const userId = toIdString(user._id);
  if (!userId) return null;

  const [bookings, packages, styles, addOns, settings, reviewDocs] =
    await Promise.all([
      bookingModel.find(
        { freelancerUserId: userId },
        { sort: { created_at: -1 } }
      ),
      new PackageModel().find({ user_id: userId }, { sort: { order: 1 } }),
      new StyleModel().find({ user_id: userId }, { sort: { order: 1 } }),
      new AddOnModel().find({ user_id: userId }, { sort: { order: 1 } }),
      new SettingModel().findSettingsByUserId(userId),
      reviewModel.findByFreelancerUserId(userId, 100),
    ]);

  if (!settings) return null;

  const chargeBy = settings.charge_by ?? "package";
  const timeSlots: TimeSlot[] = settings.time_slots?.length
    ? settings.time_slots
    : getDefaultTimeSlots(chargeBy);

  const serializedBookings = bookings.map(serializeBooking);
  const now = new Date();
  const scheduleItems = flattenScheduleItems(serializedBookings, now);
  const payment = paymentSettingSchema.parse(settings.payment ?? {});
  const invoice = invoiceSettingSchema.parse(settings.invoice ?? {});

  let bookingLink = "";
  if (user.username) {
    try {
      bookingLink = buildProfileUrl(getAppUrl(), user.username);
    } catch {
      bookingLink = `/${user.username}`;
    }
  }

  const username = user.username ?? "";

  return {
    home: {
      greeting: getGreeting(now),
      firstName: getFirstName(user.name),
      upcomingThisWeek: countUpcomingThisWeek(scheduleItems, now),
      todaysSchedule: getTodaysSchedule(scheduleItems, now),
      nextUpcoming: getNextUpcomingBooking(scheduleItems, now),
      summary: getBookingSummary(scheduleItems, now),
      outstanding: getOutstandingPayments(serializedBookings),
      activity: getRecentActivity(serializedBookings, 5),
      checklist: getSetupChecklist({
        packageCount: packages.length,
        timeSlotCount: timeSlots.length,
        hasUsername: Boolean(user.username?.trim()),
      }),
      bookingLink,
    },
    bookings: {
      initialBookings: serializedBookings,
      packages: packages.map((pkg) => ({
        _id: toIdString(pkg._id),
        name: pkg.name,
        price: pkg.price ?? 0,
        deposit: pkg.deposit ?? 0,
      })),
      styles: styles.map((style) => ({
        _id: toIdString(style._id),
        name: style.name,
        variants: style.variants.map((variant) => ({
          name: variant.name,
          order: variant.order,
          price: variant.price,
          deposit: variant.deposit,
          image_url: variant.image_url,
        })),
      })),
      addOns: addOns.map((addOn) => ({
        _id: toIdString(addOn._id),
        name: addOn.name,
        price: addOn.price,
      })),
      chargeBy,
      timeSlots,
    },
    packages: {
      initialPackages: packages.map(serializePackage),
      initialStyles: styles.map(serializeStyle),
    },
    settings: {
      initialSettings: {
        _id: toIdString(settings._id),
        charge_by: settings.charge_by,
        travel: settings.travel,
        payment,
        invoice: {
          company_name: invoice.company_name,
          company_registration_number: invoice.company_registration_number,
          company_logo: invoice.company_logo,
          terms_and_conditions: invoice.terms_and_conditions,
        },
        time_slots: timeSlots,
      },
      isStripeConnected: Boolean(user.is_stripe_connected),
      hasStripeAccount: Boolean(user.stripe_account_id),
    },
    profile: {
      initialProfile: {
        _id: userId,
        email: user.email,
        name: user.name ?? "",
        username,
        mobile: user.mobile ?? "",
        country_code: user.country_code ?? "",
        role: user.role ?? null,
        profile_photo_url: user.profile_photo_url ?? "",
        social_links: {
          instagram: user.social_links?.instagram ?? "",
          tiktok: user.social_links?.tiktok ?? "",
        },
      },
      initialReviews: reviewDocs.map(toDashboardReview),
    },
  };
}
