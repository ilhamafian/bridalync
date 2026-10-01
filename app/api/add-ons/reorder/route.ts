import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { AddOnModel } from "@/models/AddOn";
import { addOnUpdateSchema, type AddOn } from "@/schemas/addOnSchema";
import { reorderSchema } from "@/schemas/catalogSchema";
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

    const addOnModel = new AddOnModel();
    const ownedAddOns = await addOnModel.find({ user_id: userId });
    const ownedIds = new Set(ownedAddOns.map((addOn) => toIdString(addOn._id)));

    if (
      parsed.data.ids.length !== ownedAddOns.length ||
      parsed.data.ids.some((id) => !ownedIds.has(id))
    ) {
      return createResponse({ error: "Invalid add-on order." }, 400);
    }

    await Promise.all(
      parsed.data.ids.map((id, index) =>
        addOnModel.update(id, { order: index }, addOnUpdateSchema)
      )
    );

    const addOns = await addOnModel.find(
      { user_id: userId },
      { sort: { order: 1 } }
    );

    return createResponse({
      addOns: addOns.map(serializeAddOn),
    });
  } catch (error) {
    return handleError(error);
  }
}
