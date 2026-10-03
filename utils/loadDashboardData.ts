import { WithId } from "mongodb";

import type {
  AddOnItem,
  PackageItem,
  StyleItem,
} from "@/components/PackagesManager";
import { AddOnModel } from "@/models/AddOn";
import { blockedDateModel } from "@/models/BlockedDate";
import { bookingModel } from "@/models/Booking";
import { PackageModel } from "@/models/Package";
import { reviewModel } from "@/models/Review";
import { SettingModel } from "@/models/Setting";
import { StyleModel } from "@/models/Style";
import type { AddOn } from "@/schemas/addOnSchema";
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
import {
  buildClientBookingUrl,
  buildReviewUrl,
  getAppUrl,
} from "@/utils/appUrl";
import {
  buildBalanceReminderMessage,
  buildReviewRequestMessage,
  buildWhatsAppUrl,
} from "@/utils/booking/messages";
import { serializeBooking } from "@/utils/booking/serializeBooking";
import {
  countUpcomingThisWeek,
  type CompletedScheduleItem,
  flattenScheduleItems,
  getFirstName,
  getGreeting,
  getRecentActivity,
  getRecentCompletedBookings,
  getTodaysSchedule,
  getUpcomingBookings,
} from "@/utils/dashboard";
import type { DashboardData } from "@/utils/dashboardShell";
import {
  getInvoices,
  getMonthlyReports,
  getOutstandingThisMonth,
  getPayments,
  getWeekSummary,
} from "@/utils/payments";

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

function serializeAddOn(addOn: WithId<AddOn>): AddOnItem {
  return {
    _id: toIdString(addOn._id),
    name: addOn.name,
    price: addOn.price,
    order: addOn.order,
  };
}

export async function loadDashboardData(
  user: SessionUser
): Promise<DashboardData | null> {
  const userId = toIdString(user._id);
  if (!userId) return null;

  const [
    bookings,
    packages,
    styles,
    addOns,
    settings,
    reviewDocs,
    reviewedBookingIdList,
    blockedDateDocs,
  ] = await Promise.all([
      bookingModel.find(
        { freelancerUserId: userId },
        { sort: { created_at: -1 } }
      ),
      new PackageModel().find({ user_id: userId }, { sort: { order: 1 } }),
      new StyleModel().find({ user_id: userId }, { sort: { order: 1 } }),
      new AddOnModel().find({ user_id: userId }, { sort: { order: 1 } }),
      new SettingModel().findSettingsByUserId(userId),
      reviewModel.findByFreelancerUserId(userId, 100),
      reviewModel.findReviewedBookingIds(userId),
      blockedDateModel.findByUserId(userId),
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

  const username = user.username ?? "";

  let appUrl: string | null = null;
  try {
    appUrl = getAppUrl();
  } catch {
    appUrl = null;
  }
  const freelancerName = user.name?.trim() || username || "us";
  const reviewedBookingIds = new Set(reviewedBookingIdList);
  const completed: CompletedScheduleItem[] = getRecentCompletedBookings(
    scheduleItems,
    3,
    reviewedBookingIds
  ).map((item) => {
    const { clientCountryCode, clientMobile } = item;
    const leaveReviewUrl =
      appUrl && username && clientCountryCode && clientMobile
        ? buildWhatsAppUrl(
            clientCountryCode,
            clientMobile,
            buildReviewRequestMessage({
              clientName: item.clientName,
              freelancerName,
              reviewUrl: buildReviewUrl(appUrl, username, item.bookingId),
            })
          )
        : null;
    return { ...item, leaveReviewUrl };
  });

  const payments = getPayments(serializedBookings);
  const outstanding = getOutstandingThisMonth(serializedBookings, now);

  return {
    home: {
      greeting: getGreeting(now),
      firstName: getFirstName(user.name),
      upcomingThisWeek: countUpcomingThisWeek(scheduleItems, now),
      todaysSchedule: getTodaysSchedule(scheduleItems, now),
      upcoming: getUpcomingBookings(scheduleItems, now, 3),
      completed,
      activity: getRecentActivity(serializedBookings, 3),
    },
    payments: {
      week: getWeekSummary(payments, now),
      outstanding: {
        totalRm: outstanding.totalRm,
        clients: outstanding.clients.map(
          ({ countryCode, mobile, ...client }) => ({
            ...client,
            messageUrl:
              countryCode && mobile
                ? buildWhatsAppUrl(
                    countryCode,
                    mobile,
                    buildBalanceReminderMessage({
                      clientName: client.clientName,
                      balanceRm: client.balanceRm,
                      sessionDate: client.sessionDate,
                      bookingUrl:
                        appUrl && username
                          ? buildClientBookingUrl(
                              appUrl,
                              username,
                              client.bookingId
                            )
                          : null,
                    })
                  )
                : null,
          })
        ),
      },
      reports: getMonthlyReports(payments, now),
      recentPayments: payments,
      invoices: getInvoices(serializedBookings, payments),
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
      initialAddOns: addOns.map(serializeAddOn),
      chargeBy,
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
        max_booking_year: settings.max_booking_year,
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
        bio: user.bio ?? "",
        social_links: {
          instagram: user.social_links?.instagram ?? "",
          tiktok: user.social_links?.tiktok ?? "",
        },
      },
      initialReviews: reviewDocs.map(toDashboardReview),
      appUrl,
    },
    blocked: {
      dates: blockedDateDocs.map((doc) => ({
        date: doc.date,
        createdAt: doc.created_at ? new Date(doc.created_at).toISOString() : null,
      })),
    },
  };
}
