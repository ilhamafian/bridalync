import { isOnboardingComplete } from "@/schemas/userSchema";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import {
  getGoogleCalendarAccessToken,
  getGoogleCalendarStatus,
  invalidateGoogleAccessToken,
} from "@/utils/google/calendarConnection";
import { previewGoogleCalendarEvents } from "@/utils/google/importCalendarEvents";
import { GOOGLE_CALENDAR_READ_SCOPE } from "@/utils/google/oauth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !isOnboardingComplete(user.onboarding)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = toIdString(user._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const accessToken = await getGoogleCalendarAccessToken(
      userId,
      GOOGLE_CALENDAR_READ_SCOPE
    );
    if (!accessToken) {
      const status = await getGoogleCalendarStatus(userId);
      if (status.connected) {
        return createResponse({ events: [], status });
      }
      return createResponse({ error: "Google Calendar is not connected." }, 401);
    }

    try {
      const [preview, status] = await Promise.all([
        previewGoogleCalendarEvents({ accessToken, freelancerUserId: userId }),
        getGoogleCalendarStatus(userId),
      ]);
      return createResponse({ ...preview, status });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "GOOGLE_CALENDAR_UNAUTHORIZED"
      ) {
        await invalidateGoogleAccessToken(userId);
        return createResponse(
          { error: "Google Calendar access expired. Try again or reconnect." },
          502
        );
      }
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
}
