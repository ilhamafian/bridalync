import { NextRequest } from "next/server";
import { ZodSchema } from "zod";

import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import {
  isOnboardingComplete,
  profileUpdateSchema,
  updateUserSchema,
  type User,
} from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { getAppUrl, buildProfileDisplayUrl } from "@/utils/appUrl";
import { refreshSession } from "@/utils/onboarding/progress";

function serializeProfile(user: User) {
  const username = user.username ?? "";
  let profileUrl = "";
  let profileDisplayUrl = "";
  try {
    const appUrl = getAppUrl();
    if (username) {
      profileUrl = `${appUrl.replace(/\/$/, "")}/${username}`;
      profileDisplayUrl = buildProfileDisplayUrl(appUrl, username);
    }
  } catch {
    // APP_URL may be unset in some local setups
  }

  return {
    _id: toIdString(user._id as never),
    email: user.email,
    name: user.name ?? "",
    username,
    mobile: user.mobile ?? "",
    country_code: user.country_code ?? "",
    role: user.role ?? null,
    profileUrl,
    profileDisplayUrl,
  };
}

async function getAuthorizedUser() {
  const user = await getSessionUser();
  if (!user || !isOnboardingComplete(user.onboarding)) {
    return null;
  }
  return user;
}

export async function GET() {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    return createResponse({ profile: serializeProfile(user) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = toIdString(user._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const name = parsed.data.name.trim();
    const username = parsed.data.username.trim().toLowerCase();
    const mobile = parsed.data.mobile.trim();
    const country_code = parsed.data.country_code.trim();

    const userModel = new UserModel();
    const existingWithUsername = await userModel.findByUsername(username);
    if (existingWithUsername?._id) {
      const existingId = toIdString(existingWithUsername._id as never);
      if (existingId && existingId !== userId) {
        return createResponse(
          { error: "That username is already taken." },
          409
        );
      }
    }

    await userModel.update(
      userId,
      { name, username, mobile, country_code },
      updateUserSchema as ZodSchema<Partial<User>>
    );

    const refreshed = await refreshSession(userId);
    if (!refreshed) {
      return createResponse({ error: "Failed to refresh session." }, 500);
    }

    return createResponse({ profile: serializeProfile(refreshed) });
  } catch (error) {
    if (error instanceof Error) {
      return createResponse({ error: error.message }, 400);
    }
    return handleError(error);
  }
}
