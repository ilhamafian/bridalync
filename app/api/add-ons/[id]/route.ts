import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { AddOnModel } from "@/models/AddOn";
import { addOnUpdateSchema, type AddOn } from "@/schemas/addOnSchema";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

function serializeAddOn(addOn: WithId<AddOn>) {
  return {
    ...addOn,
    _id: toIdString(addOn._id),
  };
}

async function getAuthorizedUserId() {
  const user = await getSessionUser();
  if (!user || !isOnboardingComplete(user.onboarding)) {
    return null;
  }
  return toIdString(user._id) || null;
}

async function getOwnedAddOn(id: string, userId: string) {
  const addOn = await new AddOnModel().findById(id);
  if (!addOn || addOn.user_id !== userId) {
    return null;
  }
  return addOn;
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
    const existing = await getOwnedAddOn(id, userId);
    if (!existing) {
      return createResponse({ error: "Add-on not found" }, 404);
    }

    const body = await req.json();
    const parsed = addOnUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await new AddOnModel().update(
      id,
      parsed.data as Partial<AddOn>,
      addOnUpdateSchema
    );

    const updated = await new AddOnModel().findById(id);
    if (!updated) {
      return createResponse({ error: "Add-on not found" }, 404);
    }

    return createResponse({ addOn: serializeAddOn(updated) });
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
    const existing = await getOwnedAddOn(id, userId);
    if (!existing) {
      return createResponse({ error: "Add-on not found" }, 404);
    }

    await new AddOnModel().delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
