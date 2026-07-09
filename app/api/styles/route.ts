import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { StyleModel } from "@/models/Style";
import {
  styleInputSchema,
  styleSchema,
  type Style,
} from "@/schemas/styleSchema";
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

export async function GET() {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const styles = await new StyleModel().find(
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

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = styleInputSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const created = await new StyleModel().create(
      styleSchema.parse({
        ...parsed.data,
        user_id: userId,
      })
    );

    return createResponse({ style: serializeStyle(created) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
