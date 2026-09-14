import { createResponse, handleError } from "@/utils/apiHelper";
import { clearAdminSession } from "@/utils/auth/admin-session";

export async function POST() {
  try {
    await clearAdminSession();
    return createResponse({ ok: true }, 200);
  } catch (error) {
    return handleError(error);
  }
}
