import { NextRequest } from "next/server";

import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { loadPublicBookingCatalog } from "@/utils/booking/publicCatalog.server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    if (!username) {
      return createResponse({ error: "Username is required" }, 400);
    }
    const user = await new UserModel().findByUsername(username);
    if (!user?._id) {
      return createResponse({ error: "User not found" }, 404);
    }

    const catalog = await loadPublicBookingCatalog(
      toIdString(user._id),
      user.role,
      request.nextUrl.searchParams.get("excludeBooking")
    );
    if (!catalog) {
      return createResponse({ error: "Settings not found" }, 404);
    }

    return createResponse(catalog);
  } catch (error) {
    return handleError(error);
  }
}
