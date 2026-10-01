import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { AddOnModel } from "@/models/AddOn";
import {
  addOnInputSchema,
  addOnSchema,
  type AddOn,
} from "@/schemas/addOnSchema";
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

export async function GET() {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const addOns = await new AddOnModel().find(
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

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = addOnInputSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const created = await new AddOnModel().create(
      addOnSchema.parse({
        ...parsed.data,
        user_id: userId,
      })
    );

    return createResponse({ addOn: serializeAddOn(created) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
