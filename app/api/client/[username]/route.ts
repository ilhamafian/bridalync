import { NextRequest } from "next/server";
import { createResponse, handleError } from "@/utils/apiHelper";
import { AddOnModel } from "@/models/AddOn";
import { blockedDateModel } from "@/models/BlockedDate";
import { blockedSlotModel } from "@/models/BlockedSlot";
import { toPublicBlockedSlot } from "@/utils/booking/availability.server";
import { hotDateModel } from "@/models/HotDate";
import { PackageModel } from "@/models/Package";
import { loadStyleCatalog } from "@/utils/booking/styleCatalog.server";
import { usesLooks } from "@/utils/styleTerms";
import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import { SettingModel } from "@/models/Setting";
import { toPublicProfile } from "@/schemas/userSchema";
import { publicSettingSchema } from "@/schemas/settingSchema";
import { bookingModel } from "@/models/Booking";
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
import { getTravelBufferDateKeys } from "@/utils/booking/travelBuffer";

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.pathname.split("/").pop();
    if (!username) {
      return createResponse({ error: "Username is required" }, 400);
    }
    const user = await new UserModel().findByUsername(username);
    if (!user?._id) {
      return createResponse({ error: "User not found" }, 404);
    }
    const publicUser = toPublicProfile(user);
    const user_id = toIdString(user._id);
    const packages = (await new PackageModel().getPackagesByUserId(user_id)) ?? [];
    const settings = await new SettingModel().findSettingsByUserId(user_id);
    if (!settings) {
      return createResponse({ error: "Settings not found" }, 404);
    }

    const publicSettings = publicSettingSchema.parse({
      ...settings,
      max_booking_year: getEffectiveMaxBookingYear(settings.max_booking_year),
      booking_until: getEffectiveBookingUntil(settings),
    });

    const chargeBy = publicSettings.charge_by ?? "package";
    const styles =
      chargeBy === "style" || usesLooks(user.role)
        ? await loadStyleCatalog(user_id, user.role)
        : [];
    const add_ons = (await new AddOnModel().getAddOnsByUserId(user_id)) ?? [];

    const bookings = await bookingModel.find({
      freelancerUserId: user_id,
      status: { $in: SLOT_HOLDING_STATUSES },
    });
    const todayKey = toDateKey(new Date());
    const [hotDateDocs, blockedDateDocs, blockedSlotDocs] = await Promise.all([
      hotDateModel.findByUserId(user_id, {
        from: todayKey || undefined,
      }),
      blockedDateModel.findByUserId(user_id, {
        from: todayKey || undefined,
      }),
      blockedSlotModel.findByUserId(user_id, {
        from: todayKey || undefined,
      }),
    ]);
    // Blocked slots are exposed as taken so clients can't tell them apart from bookings.
    const booked_slots = [
      ...getOccupiedSlotsFromBookings(bookings),
      ...blockedSlotDocs.map(toPublicBlockedSlot),
    ];
    const hot_dates = hotDateDocs.map((doc) => toHotDateLookup(doc));
    // Travel buffer days look like any other blocked date to clients.
    const bufferDates = [
      ...getTravelBufferDateKeys(bookings, settings.travel.travel_buffer_regions),
    ].filter((dateKey) => !todayKey || dateKey >= todayKey);
    const blocked_dates = [
      ...new Set([...blockedDateDocs.map((doc) => doc.date), ...bufferDates]),
    ];

    const response = {
      user: publicUser,
      packages,
      styles,
      add_ons,
      settings: publicSettings,
      booked_slots,
      hot_dates,
      blocked_dates,
    };
    return createResponse(response);
  } catch (error) {
    return handleError(error);
  }
}
