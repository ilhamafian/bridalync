import { NextRequest } from "next/server";
import { createResponse, handleError } from "@/utils/apiHelper";
import { AddOnModel } from "@/models/AddOn";
import { blockedDateModel } from "@/models/BlockedDate";
import { hotDateModel } from "@/models/HotDate";
import { PackageModel } from "@/models/Package";
import { StyleModel } from "@/models/Style";
import { UserModel } from "@/models/User";
import { reviewModel } from "@/models/Review";
import { toIdString } from "@/schemas/objectId";
import { SettingModel } from "@/models/Setting";
import { toPublicProfile } from "@/schemas/userSchema";
import { toPublicReview } from "@/schemas/reviewSchema";
import { publicSettingSchema } from "@/schemas/settingSchema";
import { bookingModel } from "@/models/Booking";
import {
  getOccupiedSlotsFromBookings,
  toDateKey,
} from "@/utils/booking/availability";
import { getEffectiveMaxBookingYear } from "@/utils/booking/bookingWindow";
import { toHotDateLookup } from "@/utils/booking/hotDates";

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
    });

    const chargeBy = publicSettings.charge_by ?? "package";
    const styles =
      chargeBy === "style"
        ? (await new StyleModel().getStylesByUserId(user_id)) ?? []
        : [];
    const add_ons =
      chargeBy === "style"
        ? (await new AddOnModel().getAddOnsByUserId(user_id)) ?? []
        : [];

    const bookings = await bookingModel.find({
      freelancerUserId: user_id,
      status: { $in: ["pending", "confirmed", "completed"] },
    });
    const booked_slots = getOccupiedSlotsFromBookings(bookings);

    const reviewDocs = await reviewModel.findByFreelancerUserId(user_id, 20);
    const reviews = reviewDocs.map(toPublicReview);

    const todayKey = toDateKey(new Date());
    const [hotDateDocs, blockedDateDocs] = await Promise.all([
      hotDateModel.findByUserId(user_id, {
        from: todayKey || undefined,
      }),
      blockedDateModel.findByUserId(user_id, {
        from: todayKey || undefined,
      }),
    ]);
    const hot_dates = hotDateDocs.map((doc) => toHotDateLookup(doc));
    const blocked_dates = blockedDateDocs.map((doc) => doc.date);

    const response = {
      user: publicUser,
      packages,
      styles,
      add_ons,
      settings: publicSettings,
      booked_slots,
      reviews,
      hot_dates,
      blocked_dates,
    };
    return createResponse(response);
  } catch (error) {
    return handleError(error);
  }
}
