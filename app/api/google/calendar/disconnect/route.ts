import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { clearGoogleConnectCookies } from "@/utils/google/oauth";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user || !isOnboardingComplete(user.onboarding)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    await clearGoogleConnectCookies();
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
