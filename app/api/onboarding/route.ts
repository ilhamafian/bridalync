import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { NextRequest } from "next/server";
import { UserModel } from "@/models/User";

export async function GET(request: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || user.onboarding_completed) {
            return createResponse({ error: "Unauthorized" }, 401);
        }

        return createResponse({ roles: UserModel.userRoles },200);
    } catch (error) {
        return handleError(error);
    }
}