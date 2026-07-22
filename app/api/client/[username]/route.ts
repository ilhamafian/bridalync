import { NextRequest } from "next/server";
import { createResponse, handleError } from "@/utils/apiHelper";
import { AddOnModel } from "@/models/AddOn";
import { PackageModel } from "@/models/Package";
import { StyleModel } from "@/models/Style";
import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import { SettingModel } from "@/models/Setting";
import { publicUserSchema } from "@/schemas/userSchema";
import { publicSettingSchema } from "@/schemas/settingSchema";
import { bookingModel } from "@/models/Booking";
import { getOccupiedSlotsFromBookings } from "@/utils/booking/availability";

export async function GET (request: NextRequest) {
    try {
        const username = request.nextUrl.pathname.split("/").pop();
        if (!username) {
            return createResponse({ error: "Username is required" }, 400);
        }
        const user = await new UserModel().findByUsername(username);
        if (!user?._id) {
            return createResponse({ error: "User not found" }, 404);
        }
        const publicUser = publicUserSchema.parse(user);
        const user_id = toIdString(user._id);
        const packages = (await new PackageModel().getPackagesByUserId(user_id)) ?? [];
        const settings = await new SettingModel().findSettingsByUserId(user_id);
        if (!settings) {
            return createResponse({ error: "Settings not found" }, 404);
        }

        const publicSettings = publicSettingSchema.parse(settings);

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

        const response = {
            user: publicUser,
            packages,
            styles,
            add_ons,
            settings: publicSettings,
            booked_slots,
        }
        return createResponse(response);
    } catch (error) {
        return handleError(error);
    }
}
