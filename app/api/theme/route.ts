import { NextRequest } from "next/server";
import { z } from "zod";

import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import { themePreferenceSchema } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

const updateThemeSchema = z.object({ theme: themePreferenceSchema });

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const userId = toIdString(user?._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const parsed = updateThemeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await new UserModel().setTheme(userId, parsed.data.theme);
    return createResponse({ theme: parsed.data.theme });
  } catch (error) {
    return handleError(error);
  }
}
