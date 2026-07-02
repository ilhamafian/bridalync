import { NextRequest } from "next/server";
import { createResponse, handleError } from "@/utils/apiHelper";
import { PackageModel } from "@/models/Package";
import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import { SettingModel } from "@/models/Setting";

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
        const user_id = toIdString(user._id);
        const packages = await new PackageModel().getPackagesByUserId(user_id);
        if (!packages) {
            return createResponse({ error: "Packages not found" }, 404);
        }
        const settings = await new SettingModel().findSettingsByUserId(user_id);
        if (!settings) {
            return createResponse({ error: "Settings not found" }, 404);
        }

        const response = {
            user,
            packages,
            settings,
        }
        return createResponse(response);
    } catch (error) {
        return handleError(error);
    }
}