import { NextRequest } from "next/server";

import { SettingModel } from "@/models/Setting";
import { UserModel } from "@/models/User";
import { onboardingRequestSchema, type OnboardingRequest } from "@/schemas/userSchema";
import { publicUserSchema, updateUserSchema } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser, setAuthSession } from "@/utils/auth/session";
import { randomString } from "@/utils/utils";
import { toIdString } from "@/schemas/objectId";
import { bankAccountSettingSchema, invoiceSettingSchema, paymentSettingSchema, TravelSetting } from "@/schemas/settingSchema";

const DISABLED_TRAVEL_LOCATION: TravelSetting["location"] = {
  placeId: "travel-disabled",
  formattedAddress: "Travel not enabled",
  displayName: "Travel not enabled",
  location: { lat: 0, lng: 0 },
};

function buildTravelSetting(travel: OnboardingRequest["travel"]): TravelSetting {
  if (travel.enabled) {
    return {
      enabled: true,
      rate_per_km: travel.rate_per_km,
      location: travel.location,
    };
  }

  return {
    enabled: false,
    rate_per_km: 0,
    location: DISABLED_TRAVEL_LOCATION,
  };
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.onboarding_completed) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    return createResponse({ roles: UserModel.userRoles, user }, 200);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.onboarding_completed) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = toIdString(user._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = onboardingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const { role, travel } = parsed.data;

    await new UserModel().update(
      userId,
      { role, onboarding_completed: true },
      updateUserSchema
    );

    await new SettingModel().create({
      user_id: userId,
      role,
      link: randomString(7),
      travel: buildTravelSetting(travel),
      payment: paymentSettingSchema.parse({}),
      invoice: invoiceSettingSchema.parse({}),
      bank_account: bankAccountSettingSchema.parse({}),
    });

    const updatedUser = await new UserModel().findById(userId);
    if (!updatedUser) {
      return createResponse({ error: "User not found" }, 404);
    }

    const parsedUser = publicUserSchema.safeParse(updatedUser);
    if (!parsedUser.success) {
      return createResponse({ error: "Invalid user data" }, 500);
    }

    await setAuthSession(parsedUser.data);

    return createResponse({ redirectTo: "/" }, 200);
  } catch (error) {
    return handleError(error);
  }
}
