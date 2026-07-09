import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { StyleModel } from "@/models/Style";
import {
  styleSchema,
  styleUpdateSchema,
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

async function getOwnedStyle(id: string, userId: string) {
  const style = await new StyleModel().findById(id);
  if (!style || style.user_id !== userId) {
    return null;
  }
  return style;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const existing = await getOwnedStyle(id, userId);
    if (!existing) {
      return createResponse({ error: "Style not found" }, 404);
    }

    const body = await req.json();
    const parsed = styleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await new StyleModel().update(
      id,
      parsed.data as Partial<Style>,
      styleUpdateSchema
    );

    const updated = await new StyleModel().findById(id);
    if (!updated) {
      return createResponse({ error: "Style not found" }, 404);
    }

    return createResponse({ style: serializeStyle(updated) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const existing = await getOwnedStyle(id, userId);
    if (!existing) {
      return createResponse({ error: "Style not found" }, 404);
    }

    await new StyleModel().delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
