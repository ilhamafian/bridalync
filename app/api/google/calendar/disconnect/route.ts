import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { disconnectGoogleCalendar } from "@/utils/google/calendarConnection";
import { clearGoogleConnectCookies } from "@/utils/google/oauth";

export async function POST() {
  try {
    const user = await getSessionUser();
    const userId = user ? toIdString(user._id) : null;
    if (!user || !userId || !isOnboardingComplete(user.onboarding)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    await disconnectGoogleCalendar(userId);
    await clearGoogleConnectCookies();
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
