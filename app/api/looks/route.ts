import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { LookModel } from "@/models/Look";
import { lookInputSchema, lookSchema, type Look } from "@/schemas/lookSchema";
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

/** Looks belong to makeup artists only. */
async function getAuthorizedUserId() {
  const user = await getSessionUser();
  if (!user || !isOnboardingComplete(user.onboarding) || !usesLooks(user.role)) {
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

    const looks = await new LookModel().find(
      { user_id: userId },
      { sort: { order: 1 } }
    );

    return createResponse({ looks: looks.map(serializeLook) });
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
    const parsed = lookInputSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const created = await new LookModel().create(
      lookSchema.parse({
        ...parsed.data,
        user_id: userId,
      })
    );

    return createResponse({ look: serializeLook(created) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
