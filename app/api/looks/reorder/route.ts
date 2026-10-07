import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { LookModel } from "@/models/Look";
import { reorderSchema } from "@/schemas/catalogSchema";
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

    const lookModel = new LookModel();
    const ownedLooks = await lookModel.find({ user_id: userId });
    const ownedIds = new Set(ownedLooks.map((look) => toIdString(look._id)));

    if (
      parsed.data.ids.length !== ownedLooks.length ||
      parsed.data.ids.some((id) => !ownedIds.has(id))
    ) {
      return createResponse({ error: "Invalid look order." }, 400);
    }

    await Promise.all(
      parsed.data.ids.map((id, index) =>
        lookModel.update(id, { order: index }, lookUpdateSchema)
      )
    );

    const looks = await lookModel.find(
      { user_id: userId },
      { sort: { order: 1 } }
    );

    return createResponse({ looks: looks.map(serializeLook) });
  } catch (error) {
    return handleError(error);
  }
}
