import { AddOnModel } from "@/models/AddOn";
import { blockedDateModel } from "@/models/BlockedDate";
import { blockedSlotModel } from "@/models/BlockedSlot";
import { bookingModel } from "@/models/Booking";
import { hotDateModel } from "@/models/HotDate";
import { PackageModel } from "@/models/Package";
import { SettingModel } from "@/models/Setting";
import { publicSettingSchema } from "@/schemas/settingSchema";
import type { User } from "@/schemas/userSchema";
import { toPublicBlockedSlot } from "@/utils/booking/availability.server";
import {
  getOccupiedSlotsFromBookings,
  SLOT_HOLDING_STATUSES,
  toDateKey,
} from "@/utils/booking/availability";
import {
  getEffectiveBookingUntil,
  getEffectiveMaxBookingYear,
} from "@/utils/booking/bookingWindow";
import { toHotDateLookup } from "@/utils/booking/hotDates";
import { loadStyleCatalog } from "@/utils/booking/styleCatalog.server";
import { hasStyleExtras } from "@/utils/booking/styleExtras";
import { getTravelBufferDateKeys } from "@/utils/booking/travelBuffer";
import { usesLooks } from "@/utils/styleTerms";

/** Events, styles, slots and the rest of the public booking wizard. Null when settings are missing. */
export async function loadPublicBookingCatalog(
  userId: string,
  role: User["role"] | null | undefined,
  excludeBooking: string | null
) {
  const settings = await new SettingModel().findSettingsByUserId(userId);
  if (!settings) return null;

  const publicSettings = publicSettingSchema.parse({
    ...settings,
    max_booking_year: getEffectiveMaxBookingYear(settings.max_booking_year),
    booking_until: getEffectiveBookingUntil(settings),
  });

  const chargeBy = publicSettings.charge_by ?? "package";
  const [packages, catalog, addOns, bookings] = await Promise.all([
    new PackageModel().getPackagesByUserId(userId),
    loadStyleCatalog(userId, role),
    new AddOnModel().getAddOnsByUserId(userId),
    bookingModel.find({
      freelancerUserId: userId,
      status: { $in: SLOT_HOLDING_STATUSES },
    }),
  ]);

  // Charging by event, styles are only offered when some carry an extra charge (looks always).
  const styles =
    chargeBy === "style" || usesLooks(role) || hasStyleExtras(catalog)
      ? catalog
      : [];

  // The client date editor passes its own booking so that slot and its travel days stay open.
  const slotBookings = excludeBooking
    ? bookings.filter((booking) => String(booking._id) !== excludeBooking)
    : bookings;
  const todayKey = toDateKey(new Date());
  const [hotDateDocs, blockedDateDocs, blockedSlotDocs] = await Promise.all([
    hotDateModel.findByUserId(userId, {
      from: todayKey || undefined,
    }),
    blockedDateModel.findByUserId(userId, {
      from: todayKey || undefined,
    }),
    blockedSlotModel.findByUserId(userId, {
      from: todayKey || undefined,
    }),
  ]);
  // Blocked slots are exposed as taken so clients can't tell them apart from bookings.
  const booked_slots = [
    ...getOccupiedSlotsFromBookings(slotBookings),
    ...blockedSlotDocs.map(toPublicBlockedSlot),
  ];
  const hot_dates = hotDateDocs.map((doc) => toHotDateLookup(doc));
  // Travel buffer days look like any other blocked date to clients.
  const bufferDates = [
    ...getTravelBufferDateKeys(
      slotBookings,
      settings.travel.travel_buffer_regions
    ),
  ].filter((dateKey) => !todayKey || dateKey >= todayKey);
  const blocked_dates = [
    ...new Set([...blockedDateDocs.map((doc) => doc.date), ...bufferDates]),
  ];

  return {
    packages: packages ?? [],
    styles,
    add_ons: addOns ?? [],
    settings: publicSettings,
    booked_slots,
    hot_dates,
    blocked_dates,
  };
}
