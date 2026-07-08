import { NextRequest } from "next/server";
import { ZodSchema } from "zod";

import { PackageModel } from "@/models/Package";
import { SettingModel } from "@/models/Setting";
import { UserModel } from "@/models/User";
import {
  getOnboardingResumeStep,
  isOnboardingComplete,
  onboardingStepRequestSchema,
  updateUserSchema,
  type OnboardingStepRequest,
  type UpdateUser,
  type User,
} from "@/schemas/userSchema";
import { packageSchema } from "@/schemas/packageSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { toIdString } from "@/schemas/objectId";
import { settingSchema, type TravelSetting } from "@/schemas/settingSchema";
import { getAppUrl } from "@/utils/appUrl";
import {
  refreshSession,
  updateOnboardingProgress,
} from "@/utils/onboarding/progress";
import {
  buildStripeOwner,
  provisionDeferredStripeAccount,
} from "@/utils/stripe/connect";

const DISABLED_TRAVEL_LOCATION: TravelSetting["location"] = {
  placeId: "travel-disabled",
  formattedAddress: "Travel not enabled",
  displayName: "Travel not enabled",
  location: { lat: 0, lng: 0 },
};

const DEFAULT_PACKAGES = [
  {
    name: "Nikah",
    price: 800,
    deposit: 250,
    order: 0,
    session_templates: [{ name: "Nikah", order: 0 }],
  },
  {
    name: "Sanding",
    price: 800,
    deposit: 250,
    order: 1,
    session_templates: [{ name: "Sanding", order: 0 }],
  },
  {
    name: "Nikah & Sanding",
    price: 1500,
    deposit: 400, 
    order: 2,
    session_templates: [
      { name: "Nikah", order: 0 },
      { name: "Sanding", order: 1 },
    ],
  },
  {
    name: "Tunang",
    price: 450,
    deposit: 150,
    order: 3,
    session_templates: [{ name: "Tunang", order: 0 }],
  },
  {
    name: "Konvo",
    price: 450,
    deposit: 150,
    order: 4,
    session_templates: [{ name: "Konvo", order: 0 }],
  },
  {
    name: "Photoshoot",
    price: 450,
    deposit: 150,
    order: 5,
    session_templates: [{ name: "Photoshoot", order: 0 }],
  },
  {
    name: "Trial Makeup",
    price: 600,
    deposit: 200,
    order: 6,
    session_templates: [{ name: "Trial Makeup", order: 0 }],
  },
] as const;

function buildStripeConnectStatus(user: {
  stripe_account_id?: string;
  is_stripe_connected?: boolean;
  deferred_onboarding?: {
    has_minimal_account?: boolean;
    pending_earnings?: number;
    earnings_count?: number;
    onboarding_notifications?: boolean;
  };
}) {
  return {
    accountId: user.stripe_account_id ?? null,
    isStripeConnected: user.is_stripe_connected ?? false,
    deferredOnboarding: {
      hasMinimalAccount: user.deferred_onboarding?.has_minimal_account ?? false,
      pendingEarnings: user.deferred_onboarding?.pending_earnings ?? 0,
      earningsCount: user.deferred_onboarding?.earnings_count ?? 0,
      onboardingNotifications:
        user.deferred_onboarding?.onboarding_notifications ?? false,
    },
  };
}

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

async function ensureDefaultPackages(userId: string) {
  const packageModel = new PackageModel();
  const existing = await packageModel.findOne({ user_id: userId } as never);

  if (!existing) {
    await Promise.all(
      DEFAULT_PACKAGES.map((pkg) =>
        packageModel.create(
          packageSchema.parse({
            user_id: userId,
            ...pkg,
          })
        )
      )
    );
  }

  await updateOnboardingProgress(userId, {
    createdFirstPackage: true,
  });
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
      await ensureDefaultPackages(userId);
      const refreshedUser = await refreshSession(userId);
      if (refreshedUser) {
        return createResponse(
          {
            roles: UserModel.userRoles,
            user: refreshedUser,
            resumeStep: getOnboardingResumeStep(refreshedUser.onboarding),
            appUrl: getAppUrl(),
            stripeConnect: buildStripeConnectStatus(refreshedUser),
          },
          200
        );
      }
    }

    if (
      userId &&
      user.onboarding?.configuredInvoice &&
      !user.onboarding.configureBankAccount &&
      user.email
    ) {
      await provisionDeferredStripeAccount(
        userId,
        buildStripeOwner(user),
        user.stripe_account_id
      );
      await updateOnboardingProgress(userId, {
        configureBankAccount: true,
      });
      const refreshedUser = await refreshSession(userId);
      if (refreshedUser) {
        return createResponse(
          {
            roles: UserModel.userRoles,
            user: refreshedUser,
            resumeStep: getOnboardingResumeStep(refreshedUser.onboarding),
            appUrl: getAppUrl(),
            stripeConnect: buildStripeConnectStatus(refreshedUser),
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
        stripeConnect: buildStripeConnectStatus(user),
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
            charge_by,
            travel: buildTravelSetting(travel),
          })
        );

        await ensureDefaultPackages(userId);
        await refreshSession(userId);
        return createResponse({ ok: true }, 200);
      }

      case "invoice": {
        const {
          company_name,
          terms_and_conditions,
          company_registration_number,
          company_logo,
        } = stepData;

        const settingsModel = new SettingModel();
        await settingsModel.updateSettingsByUserId(userId, {
          invoice: {
            company_name,
            terms_and_conditions,
            company_registration_number,
            ...(company_logo ? { company_logo } : {}),
          },
        });

        if (!user.email) {
          return createResponse({ error: "Unauthorized" }, 401);
        }

        await provisionDeferredStripeAccount(
          userId,
          buildStripeOwner(user),
          user.stripe_account_id
        );

        await updateOnboardingProgress(userId, {
          configuredInvoice: true,
          configureBankAccount: true,
        });
        await refreshSession(userId);
        return createResponse({ ok: true }, 200);
      }

      case "username": {
        const { username, name, mobile, country_code } = stepData;
        const normalizedUsername = username.toLowerCase();
        const existingUser = await new UserModel().findByUsername(normalizedUsername);
        if (existingUser?._id) {
          return createResponse(
            { error: "That username is already taken." },
            409
          );
        }

        await new UserModel().update(
          userId,
          {
            username: normalizedUsername,
            name: name.trim(),
            mobile: mobile.trim(),
            country_code,
          } as Partial<User>,
          updateUserSchema as ZodSchema<Partial<User>>
        );

        await updateOnboardingProgress(userId, {
          configuredUsername: true,
        });

        await refreshSession(userId);
        return createResponse({ ok: true }, 200);
      }
    }
  } catch (error) {
    return handleError(error);
  }
}
