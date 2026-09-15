import type {
  AddOnCatalogItem,
  PackageCatalogItem,
  StyleCatalogItem,
} from "@/components/BookingsManager";
import type { DashboardHomeProps } from "@/components/dashboard/DashboardHome";
import type { PackageItem, StyleItem } from "@/components/PackagesManager";
import type { ProfileItem } from "@/components/profile/ProfileManager";
import type { SettingsItem } from "@/components/SettingsManager";
import type { DashboardReview } from "@/schemas/reviewSchema";
import type { TimeSlot } from "@/schemas/settingSchema";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

export type DashboardSection =
  | "home"
  | "bookings"
  | "packages"
  | "settings"
  | "profile";

export type DashboardData = {
  home: DashboardHomeProps;
  bookings: {
    initialBookings: SerializedBooking[];
    packages: PackageCatalogItem[];
    styles: StyleCatalogItem[];
    addOns: AddOnCatalogItem[];
    chargeBy: "package" | "style";
    timeSlots: TimeSlot[];
  };
  packages: {
    initialPackages: PackageItem[];
    initialStyles: StyleItem[];
    chargeBy: "package" | "style";
  };
  settings: {
    initialSettings: SettingsItem;
    isStripeConnected: boolean;
    hasStripeAccount: boolean;
  };
  profile: {
    initialProfile: ProfileItem;
    initialReviews: DashboardReview[];
  };
};

export function getDashboardSection(pathname: string): DashboardSection {
  if (pathname.startsWith("/dashboard/bookings")) return "bookings";
  if (pathname.startsWith("/dashboard/packages")) return "packages";
  if (pathname.startsWith("/dashboard/settings")) return "settings";
  if (pathname.startsWith("/dashboard/profile")) return "profile";
  return "home";
}
