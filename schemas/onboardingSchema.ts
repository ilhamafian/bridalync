import { z } from "zod";

import { addressSchema } from "./addressSchema";

export const onboardingProgressSchema = z.object({
  initial_onboarding: z.boolean().default(false),
  congfigureTravelSettings: z.boolean().default(false),
  createdFirstPackage: z.boolean().default(false),
  configuredInvoice: z.boolean().default(false),
  configureBankAccount: z.boolean().default(false),
  configuredUsername: z.boolean().default(false),
});

export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;

export const defaultOnboardingProgress = (): OnboardingProgress =>
  onboardingProgressSchema.parse({});

export function isInitialOnboardingComplete(
  onboarding: OnboardingProgress | undefined
): boolean {
  return onboarding?.initial_onboarding === true;
}

export function isOnboardingComplete(
  onboarding: OnboardingProgress | undefined
): boolean {
  if (!onboarding) return false;

  return (
    onboarding.initial_onboarding &&
    onboarding.congfigureTravelSettings &&
    onboarding.createdFirstPackage &&
    onboarding.configuredInvoice &&
    onboarding.configureBankAccount &&
    onboarding.configuredUsername
  );
}

export const ONBOARDING_STEP_ORDER = [
  "role",
  "travel",
  "invoice",
  "username",
  "preview_profile",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_ORDER)[number];

export function getOnboardingResumeStep(
  onboarding: OnboardingProgress | undefined
): OnboardingStepId {
  if (!onboarding?.congfigureTravelSettings) return "role";
  if (!onboarding.configuredInvoice) return "invoice";
  if (!onboarding.configuredUsername) return "username";
  return "preview_profile";
}

const travelStepSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }),
  z.object({
    enabled: z.literal(true),
    rate_per_km: z.number().min(0),
    location: addressSchema,
  }),
]);

export const onboardingRoleTravelSchema = z.object({
  step: z.literal("role_travel"),
  role: z.enum(["hijabstylist", "makeupartist"]),
  charge_by: z.enum(["package", "style"]),
  travel: travelStepSchema,
});

export const onboardingInvoiceSchema = z.object({
  step: z.literal("invoice"),
  company_name: z.string().min(1),
  terms_and_conditions: z.string().min(1),
  company_registration_number: z.string().optional(),
  company_logo: z.url().optional(),
});

export const onboardingUsernameSchema = z.object({
  step: z.literal("username"),
  name: z.string().min(1),
  username: z
    .string()
    .min(3)
    .regex(/^[a-z0-9_-]+$/i, "Use letters, numbers, hyphens, or underscores."),
});

export const onboardingStepRequestSchema = z.discriminatedUnion("step", [
  onboardingRoleTravelSchema,
  onboardingInvoiceSchema,
  onboardingUsernameSchema,
]);

export type OnboardingStepRequest = z.infer<typeof onboardingStepRequestSchema>;

export const onboardingRequestSchema = onboardingRoleTravelSchema.omit({
  step: true,
});

export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>;

/** Client-safe subset of the public user used during onboarding UI. */
export type OnboardingUser = {
  _id?: string;
  email?: string;
  role?: string;
  name?: string;
  username?: string;
  onboarding?: OnboardingProgress;
};
