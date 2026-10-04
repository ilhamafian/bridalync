import { NextRequest } from "next/server";
import { z } from "zod";

import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import { themeColorSchema, themePreferenceSchema } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

const updateThemeSchema = z
  .object({
    theme: themePreferenceSchema.optional(),
    color: themeColorSchema.optional(),
  })
  .refine((data) => data.theme || data.color, {
    message: "Provide a theme or color.",
  });

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

    const { theme, color } = parsed.data;
    await new UserModel().setThemePreferences(userId, {
      ...(theme ? { theme } : {}),
      ...(color ? { theme_color: color } : {}),
    });
    return createResponse({ theme, color });
  } catch (error) {
    return handleError(error);
  }
}
