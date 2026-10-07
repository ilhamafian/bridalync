import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { LookModel } from "@/models/Look";
import { lookUpdateSchema, type Look } from "@/schemas/lookSchema";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { usesLooks } from "@/utils/styleTerms";

function serializeLook(look: WithId<Look>) {
  return {
    ...look,
    _id: toIdString(look._id),
  };
}

async function getAuthorizedUserId() {
  const user = await getSessionUser();
  if (!user || !isOnboardingComplete(user.onboarding) || !usesLooks(user.role)) {
    return null;
  }
  return toIdString(user._id) || null;
}

async function getOwnedLook(id: string, userId: string) {
  const look = await new LookModel().findById(id);
  if (!look || look.user_id !== userId) {
    return null;
  }
  return look;
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
    const existing = await getOwnedLook(id, userId);
    if (!existing) {
      return createResponse({ error: "Look not found" }, 404);
    }

    const body = await req.json();
    const parsed = lookUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await new LookModel().update(
      id,
      parsed.data as Partial<Look>,
      lookUpdateSchema
    );

    const updated = await new LookModel().findById(id);
    if (!updated) {
      return createResponse({ error: "Look not found" }, 404);
    }

    return createResponse({ look: serializeLook(updated) });
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
    const existing = await getOwnedLook(id, userId);
    if (!existing) {
      return createResponse({ error: "Look not found" }, 404);
    }

    await new LookModel().delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
