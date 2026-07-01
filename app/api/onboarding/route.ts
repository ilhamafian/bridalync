import { NextRequest } from "next/server";
import { ZodSchema } from "zod";

import { PackageModel } from "@/models/Package";
import { SettingModel } from "@/models/Setting";
import { UserModel } from "@/models/User";
import {
  getOnboardingResumeStep,
  isOnboardingComplete,
  onboardingStepRequestSchema,
  publicUserSchema,
  updateUserSchema,
  type OnboardingStepRequest,
  type UpdateUser,
  type User,
} from "@/schemas/userSchema";
import { packageSchema } from "@/schemas/packageSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser, setAuthSession } from "@/utils/auth/session";
import { toIdString } from "@/schemas/objectId";
import { settingSchema, type TravelSetting } from "@/schemas/settingSchema";
import { userExists } from "@/utils/users";

const DISABLED_TRAVEL_LOCATION: TravelSetting["location"] = {
  placeId: "travel-disabled",
  formattedAddress: "Travel not enabled",
  displayName: "Travel not enabled",
  location: { lat: 0, lng: 0 },
};

function buildTravelSetting(
  travel: Extract<OnboardingStepRequest, { step: "role_travel" }>["travel"]
): TravelSetting {
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

async function updateOnboardingProgress(
  userId: string,
  onboarding: NonNullable<UpdateUser["onboarding"]>
) {
  const userUpdates: UpdateUser = { onboarding };

  await new UserModel().update(
    userId,
    userUpdates as Partial<User>,
    updateUserSchema as ZodSchema<Partial<User>>
  );
}

async function refreshSession(userId: string) {
  const updatedUser = await new UserModel().findById(userId);
  if (!updatedUser) {
    return null;
  }

  const parsedUser = publicUserSchema.safeParse(updatedUser);
  if (!parsedUser.success) {
    return null;
  }

  await setAuthSession(parsedUser.data);
  return parsedUser.data;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || isOnboardingComplete(user.onboarding)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    return createResponse(
      {
        roles: UserModel.userRoles,
        user,
        resumeStep: getOnboardingResumeStep(user.onboarding),
      },
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || isOnboardingComplete(user.onboarding)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = toIdString(user._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = onboardingStepRequestSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const stepData = parsed.data;

    switch (stepData.step) {
      case "role_travel": {
        const { role, travel, charge_by } = stepData;

        await new UserModel().update(
          userId,
          {
            role,
            onboarding: {
              initial_onboarding: true,
              congfigureTravelSettings: true,
            },
          } as Partial<User>,
          updateUserSchema as ZodSchema<Partial<User>>
        );

        const settingsModel = new SettingModel();
        await settingsModel.insertSettings(
          userId,
          settingSchema.parse({
            user_id: userId,
            role,
            charge_by,
            travel: buildTravelSetting(travel),
          })
        );

        await refreshSession(userId);
        return createResponse({ ok: true }, 200);
      }

      case "package": {
        const { name, price, session_templates } = stepData;

        await new PackageModel().create(
          packageSchema.parse({
            user_id: userId,
            name,
            price,
            session_templates,
          })
        );

        await updateOnboardingProgress(userId, {
          createdFirstPackage: true,
        });
        await refreshSession(userId);
        return createResponse({ ok: true }, 200);
      }

      case "invoice": {
        const {
          company_name,
          terms_and_conditions,
          company_registration_number,
        } = stepData;

        const settingsModel = new SettingModel();
        await settingsModel.updateByUserId(userId, {
          invoice: {
            company_name,
            terms_and_conditions,
            company_registration_number,
          },
        });

        await updateOnboardingProgress(userId, {
          configuredInvoice: true,
        });
        await refreshSession(userId);
        return createResponse({ ok: true }, 200);
      }

      case "bank_account": {
        const { bank_name, account_number, account_name } = stepData;

        const settingsModel = new SettingModel();
        await settingsModel.updateByUserId(userId, {
          bank_account: {
            bank_name,
            account_number,
            account_name,
          },
        });

        await updateOnboardingProgress(userId, {
          configureBankAccount: true,
        });
        await refreshSession(userId);
        return createResponse({ ok: true }, 200);
      }

      case "username": {
        const username = stepData.username.toLowerCase();

        if (await userExists(username)) {
          return createResponse(
            { error: "That username is already taken." },
            409
          );
        }

        await new UserModel().update(
          userId,
          {
            username,
            onboarding: {
              configuredUsername: true,
            },
          } as Partial<User>,
          updateUserSchema as ZodSchema<Partial<User>>
        );

        await refreshSession(userId);
        return createResponse({ ok: true }, 200);
      }

      case "preview_bookings": {
        await updateOnboardingProgress(userId, {
          previewedBookings: true,
        });
        await refreshSession(userId);
        return createResponse({ redirectTo: "/dashboard" }, 200);
      }
    }
  } catch (error) {
    return handleError(error);
  }
}
