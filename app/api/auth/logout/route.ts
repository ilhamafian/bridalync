import { clearAuthSession } from "@/utils/auth/session";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST() {
  try {
    await clearAuthSession();
    return createResponse({ redirectTo: "/auth" }, 200);
  } catch (error) {
    return handleError(error);
  }
}
