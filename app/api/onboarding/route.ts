import { NextRequest } from "next/server";
import { ZodSchema } from "zod";

import { PackageModel } from "@/models/Package";
import { SettingModel } from "@/models/Setting";
import { UserModel } from "@/models/User";
import {
  getOnboardingResumeStep,
  isOnboardingComplete,
  onboardingProgressSchema,
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
import { getAppUrl } from "@/utils/appUrl";

const DISABLED_TRAVEL_LOCATION: TravelSetting["location"] = {
  placeId: "travel-disabled",
  formattedAddress: "Travel not enabled",
  displayName: "Travel not enabled",
  location: { lat: 0, lng: 0 },
};

const DEFAULT_SAMPLE_PACKAGE = {
  name: "Sample session",
  price: 1000,
  session_templates: [{ name: "Sample session", order: 0 }],
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
  partial: NonNullable<UpdateUser["onboarding"]>
) {
  const userModel = new UserModel();
  const user = await userModel.findById(userId);
  const current = onboardingProgressSchema.parse(user?.onboarding ?? {});
  const merged = onboardingProgressSchema.parse({ ...current, ...partial });

  await userModel.update(
    userId,
    { onboarding: merged } as Partial<User>,
    updateUserSchema as ZodSchema<Partial<User>>
  );
}

async function ensureDefaultSamplePackage(userId: string) {
  const packageModel = new PackageModel();
  const existing = await packageModel.findOne({ user_id: userId } as never);

  if (!existing) {
    await packageModel.create(
      packageSchema.parse({
        user_id: userId,
        ...DEFAULT_SAMPLE_PACKAGE,
      })
    );
  }

  await updateOnboardingProgress(userId, {
    createdFirstPackage: true,
  });
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

    const userId = toIdString(user._id);
    if (
      userId &&
      user.onboarding?.congfigureTravelSettings &&
      !user.onboarding.createdFirstPackage
    ) {
      await ensureDefaultSamplePackage(userId);
      const refreshedUser = await refreshSession(userId);
      if (refreshedUser) {
        return createResponse(
          {
            roles: UserModel.userRoles,
            user: refreshedUser,
            resumeStep: getOnboardingResumeStep(refreshedUser.onboarding),
            appUrl: getAppUrl(),
          },
          200
        );
      }
    }

    return createResponse(
      {
        roles: UserModel.userRoles,
        user,
        resumeStep: getOnboardingResumeStep(user.onboarding),
        appUrl: getAppUrl(),
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
          { role } as Partial<User>,
          updateUserSchema as ZodSchema<Partial<User>>
        );

        await updateOnboardingProgress(userId, {
          initial_onboarding: true,
          congfigureTravelSettings: true,
        });

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

        await ensureDefaultSamplePackage(userId);
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
          { username } as Partial<User>,
          updateUserSchema as ZodSchema<Partial<User>>
        );

        await updateOnboardingProgress(userId, {
          configuredUsername: true,
        });

        await refreshSession(userId);
        return createResponse({ ok: true }, 200);
      }

      case "preview_profile": {
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
