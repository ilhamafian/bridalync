import { isOnboardingComplete } from "@/schemas/userSchema";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { getGoogleCalendarAccessToken } from "@/utils/google/oauth";
import { previewGoogleCalendarEvents } from "@/utils/google/importCalendarEvents";

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

    const accessToken = await getGoogleCalendarAccessToken(userId);
    if (!accessToken) {
      return createResponse({ error: "Google Calendar is not connected." }, 401);
    }

    try {
      const preview = await previewGoogleCalendarEvents({
        accessToken,
        freelancerUserId: userId,
      });
      return createResponse(preview);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "GOOGLE_CALENDAR_UNAUTHORIZED"
      ) {
        return createResponse(
          { error: "Google Calendar access expired. Connect again." },
          401
        );
      }
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
}
