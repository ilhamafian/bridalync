import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionAdmin } from "@/utils/auth/admin-session";

export async function GET() {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return createResponse({ authenticated: false }, 401);
    }

    return createResponse(
      {
        authenticated: true,
        email: admin.email,
      },
      200
    );
  } catch (error) {
    return handleError(error);
  }
}
