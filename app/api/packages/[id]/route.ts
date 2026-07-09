import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { PackageModel } from "@/models/Package";
import {
  packageSchema,
  packageUpdateSchema,
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

async function getOwnedPackage(id: string, userId: string) {
  const pkg = await new PackageModel().findById(id);
  if (!pkg || pkg.user_id !== userId) {
    return null;
  }
  return pkg;
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
    const existing = await getOwnedPackage(id, userId);
    if (!existing) {
      return createResponse({ error: "Package not found" }, 404);
    }

    const body = await req.json();
    const parsed = packageUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await new PackageModel().update(
      id,
      parsed.data as Partial<Package>,
      packageUpdateSchema
    );

    const updated = await new PackageModel().findById(id);
    if (!updated) {
      return createResponse({ error: "Package not found" }, 404);
    }

    return createResponse({ package: serializePackage(updated) });
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
    const existing = await getOwnedPackage(id, userId);
    if (!existing) {
      return createResponse({ error: "Package not found" }, 404);
    }

    await new PackageModel().delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
