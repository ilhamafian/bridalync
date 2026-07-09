import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { PackageModel } from "@/models/Package";
import { reorderSchema } from "@/schemas/catalogSchema";
import { packageUpdateSchema, type Package } from "@/schemas/packageSchema";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

function serializePackage(pkg: WithId<Package>) {
  return {
    ...pkg,
    _id: toIdString(pkg._id),
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

    const packageModel = new PackageModel();
    const ownedPackages = await packageModel.find({ user_id: userId });
    const ownedIds = new Set(ownedPackages.map((pkg) => toIdString(pkg._id)));

    if (
      parsed.data.ids.length !== ownedPackages.length ||
      parsed.data.ids.some((id) => !ownedIds.has(id))
    ) {
      return createResponse({ error: "Invalid package order." }, 400);
    }

    await Promise.all(
      parsed.data.ids.map((id, index) =>
        packageModel.update(id, { order: index }, packageUpdateSchema)
      )
    );

    const packages = await packageModel.find(
      { user_id: userId },
      { sort: { order: 1 } }
    );

    return createResponse({
      packages: packages.map(serializePackage),
    });
  } catch (error) {
    return handleError(error);
  }
}
