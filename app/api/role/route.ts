import { NextRequest } from "next/server";
import { z } from "zod";

import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete, userRoleSchema } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { refreshSession } from "@/utils/onboarding/progress";

const updateRoleSchema = z.object({ role: userRoleSchema });

/** Changes only the user's role; settings (incl. the pricing model) are left as they are. */
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const userId = toIdString(user?._id);
    if (!user || !userId || !isOnboardingComplete(user.onboarding)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const parsed = updateRoleSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await new UserModel().setRole(userId, parsed.data.role);
    await refreshSession(userId);
    return createResponse({ role: parsed.data.role });
  } catch (error) {
    return handleError(error);
  }
}
