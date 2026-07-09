import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { StyleModel } from "@/models/Style";
import { reorderSchema } from "@/schemas/catalogSchema";
import { styleUpdateSchema, type Style } from "@/schemas/styleSchema";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

function serializeStyle(style: WithId<Style>) {
  return {
    ...style,
    _id: toIdString(style._id),
  };
}

async function getAuthorizedUserId() {
  const user = await getSessionUser();
  if (!user || !isOnboardingComplete(user.onboarding)) {
    return null;
  }
  return toIdString(user._id) || null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const styleModel = new StyleModel();
    const ownedStyles = await styleModel.find({ user_id: userId });
    const ownedIds = new Set(ownedStyles.map((style) => toIdString(style._id)));

    if (
      parsed.data.ids.length !== ownedStyles.length ||
      parsed.data.ids.some((id) => !ownedIds.has(id))
    ) {
      return createResponse({ error: "Invalid style order." }, 400);
    }

    await Promise.all(
      parsed.data.ids.map((id, index) =>
        styleModel.update(id, { order: index }, styleUpdateSchema)
      )
    );

    const styles = await styleModel.find(
      { user_id: userId },
      { sort: { order: 1 } }
    );

    return createResponse({
      styles: styles.map(serializeStyle),
    });
  } catch (error) {
    return handleError(error);
  }
}
