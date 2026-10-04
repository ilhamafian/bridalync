import { NextRequest } from "next/server";
import { z } from "zod";

import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

const markReadSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.string().min(1).max(100)).min(1).max(200) }),
]);

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const userId = toIdString(user?._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const parsed = markReadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const userModel = new UserModel();
    if ("all" in parsed.data) {
      const seenAt = new Date();
      await userModel.markAllNotificationsRead(userId, seenAt);
      return createResponse({ seenAt: seenAt.toISOString() });
    }

    await userModel.markNotificationsRead(userId, parsed.data.ids);
    return createResponse({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
