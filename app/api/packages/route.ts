import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { PackageModel } from "@/models/Package";
import {
  packageInputSchema,
  packageSchema,
  type Package,
} from "@/schemas/packageSchema";
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

export async function GET() {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const packages = await new PackageModel().find(
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

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = packageInputSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const created = await new PackageModel().create(
      packageSchema.parse({
        ...parsed.data,
        user_id: userId,
      })
    );

    return createResponse({ package: serializePackage(created) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
