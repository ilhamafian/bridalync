import type {
  AddOnCatalogItem,
  BookingFormTravel,
  PackageCatalogItem,
  StyleCatalogItem,
} from "@/components/booking/BookingForm";
import type { DashboardHomeProps } from "@/components/dashboard/DashboardHome";
import type { PaymentsPageProps } from "@/components/dashboard/payments/PaymentsPage";
import type {
  AddOnItem,
  PackageItem,
  StyleItem,
} from "@/components/PackagesManager";
import type { ProfileItem } from "@/components/profile/ProfileManager";
import type { SettingsItem } from "@/components/SettingsManager";
import type { PublicHotDate } from "@/schemas/hotDateSchema";
import type { DashboardReview } from "@/schemas/reviewSchema";
import type { TimeSlot } from "@/schemas/settingSchema";
import type { NotificationReadState } from "@/utils/activity";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

export type DashboardSection =
  | "home"
  | "payments"
  | "notifications"
  | "bookings"
  | "booking-details"
  | "booking-form"
  | "blocked"
  | "block-dates"
  | "block-slots"
  | "hot-dates"
  | "hot-dates-new"
  | "booking-period"
  | "settings"
  | "settings-category"
  | "profile"
  | "profile-reviews";

export const SETTINGS_CATEGORIES = [
  "pricing-model",
  "events",
  "time-slots",
  "travel-fee",
  "payment-method",
  "invoice",
  "messages",
  "google-calendar",
  "theme",
  "notifications",
  "password",
] as const;

export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

/** Sections reachable from the bottom navbar; these show the top header. */
export const NAVBAR_SECTIONS: readonly DashboardSection[] = [
  "home",
  "payments",
  "settings",
  "profile",
];

export type DashboardData = {
  home: DashboardHomeProps;
  payments: PaymentsPageProps;
  bookings: {
    initialBookings: SerializedBooking[];
    packages: PackageCatalogItem[];
    styles: StyleCatalogItem[];
    addOns: AddOnCatalogItem[];
    chargeBy: "package" | "style";
    timeSlots: TimeSlot[];
    travel: BookingFormTravel | null;
  };
  packages: {
    initialPackages: PackageItem[];
    initialStyles: StyleItem[];
    initialAddOns: AddOnItem[];
    chargeBy: "package" | "style";
  };
  settings: {
    initialSettings: SettingsItem;
    isStripeConnected: boolean;
    hasStripeAccount: boolean;
    /** Name used for `{business_name}` in message templates. */
    freelancerName: string;
  };
  profile: {
    initialProfile: ProfileItem;
    initialReviews: DashboardReview[];
    appUrl: string | null;
  };
  blocked: {
    dates: BlockedDateItem[];
    slots: BlockedSlotItem[];
  };
  hotDates: HotDateItem[];
  /** Last date (YYYY-MM-DD, inclusive) clients can book. */
  bookingUntil: string;
  notifications: NotificationReadState;
};

export type HotDateItem = PublicHotDate;

export type BlockedDateItem = {
  /** YYYY-MM-DD */
  date: string;
  createdAt: string | null;
};

export type BlockedSlotItem = {
  /** YYYY-MM-DD */
  date: string;
  startTime: string;
  endTime: string;
  createdAt: string | null;
};

/** Booking id from `/dashboard/bookings/[id]`, or null for other paths. */
export function getBookingDetailsId(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/bookings\/([^/]+)\/?$/);
  if (!match || match[1] === "new") return null;
  return decodeURIComponent(match[1]);
}

export type BookingFormTarget = { mode: "new" } | { mode: "edit"; id: string };

/** `/dashboard/bookings/new` or `/dashboard/bookings/[id]/edit`, else null. */
export function getBookingFormTarget(pathname: string): BookingFormTarget | null {
  if (/^\/dashboard\/bookings\/new\/?$/.test(pathname)) return { mode: "new" };
  const match = pathname.match(/^\/dashboard\/bookings\/([^/]+)\/edit\/?$/);
  if (!match || match[1] === "new") return null;
  return { mode: "edit", id: decodeURIComponent(match[1]) };
}

/** Category from `/dashboard/settings/[category]`, or null for other paths. */
export function getSettingsCategory(pathname: string): SettingsCategory | null {
  const match = pathname.match(/^\/dashboard\/settings\/([^/]+)\/?$/);
  if (!match) return null;
  const slug = decodeURIComponent(match[1]);
  return (SETTINGS_CATEGORIES as readonly string[]).includes(slug)
    ? (slug as SettingsCategory)
    : null;
}

export function getDashboardSection(pathname: string): DashboardSection {
  if (getSettingsCategory(pathname)) return "settings-category";
  if (getBookingFormTarget(pathname)) return "booking-form";
  if (getBookingDetailsId(pathname)) return "booking-details";
  if (pathname.startsWith("/dashboard/payments")) return "payments";
  if (pathname.startsWith("/dashboard/notifications")) return "notifications";
  if (pathname.startsWith("/dashboard/blocked/dates/new")) return "block-dates";
  if (pathname.startsWith("/dashboard/blocked/slots/new")) return "block-slots";
  if (pathname.startsWith("/dashboard/blocked")) return "blocked";
  if (pathname.startsWith("/dashboard/hot-dates/new")) return "hot-dates-new";
  if (pathname.startsWith("/dashboard/hot-dates")) return "hot-dates";
  if (pathname.startsWith("/dashboard/booking-period")) return "booking-period";
  if (pathname.startsWith("/dashboard/bookings")) return "bookings";
  if (pathname.startsWith("/dashboard/settings")) return "settings";
  if (pathname.startsWith("/dashboard/profile/reviews")) return "profile-reviews";
  if (pathname.startsWith("/dashboard/profile")) return "profile";
  return "home";
}
