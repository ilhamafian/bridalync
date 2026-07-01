import { z } from "zod";

import { addressSchema } from "./addressSchema";

export const onboardingProgressSchema = z.object({
  initial_onboarding: z.boolean().default(false),
  congfigureTravelSettings: z.boolean().default(false),
  createdFirstPackage: z.boolean().default(false),
  configuredInvoice: z.boolean().default(false),
  configureBankAccount: z.boolean().default(false),
  configuredUsername: z.boolean().default(false),
  previewedBookings: z.boolean().default(false),
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
    onboarding.configuredUsername &&
    onboarding.previewedBookings
  );
}

export const ONBOARDING_STEP_ORDER = [
  "role",
  "travel",
  "package",
  "invoice",
  "bank_account",
  "username",
  "preview_bookings",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_ORDER)[number];

export function getOnboardingResumeStep(
  onboarding: OnboardingProgress | undefined
): OnboardingStepId {
  if (!onboarding?.congfigureTravelSettings) return "role";
  if (!onboarding.createdFirstPackage) return "package";
  if (!onboarding.configuredInvoice) return "invoice";
  if (!onboarding.configureBankAccount) return "bank_account";
  if (!onboarding.configuredUsername) return "username";
  if (!onboarding.previewedBookings) return "preview_bookings";
  return "preview_bookings";
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
  charge_by: z.enum(["offering", "style"]),
  travel: travelStepSchema,
});

export const onboardingPackageSchema = z.object({
  step: z.literal("package"),
  name: z.string().min(1),
  price: z.number().min(0),
  session_templates: z
    .array(
      z.object({
        name: z.string().min(1),
        order: z.number(),
      })
    )
    .min(1),
});

export const onboardingInvoiceSchema = z.object({
  step: z.literal("invoice"),
  company_name: z.string().min(1),
  terms_and_conditions: z.string().min(1),
  company_registration_number: z.string().optional(),
});

export const onboardingBankAccountSchema = z.object({
  step: z.literal("bank_account"),
  bank_name: z.string().min(1),
  account_number: z.string().min(1),
  account_name: z.string().min(1),
});

export const onboardingUsernameSchema = z.object({
  step: z.literal("username"),
  username: z
    .string()
    .min(3)
    .regex(/^[a-z0-9_-]+$/i, "Use letters, numbers, hyphens, or underscores."),
});

export const onboardingPreviewBookingsSchema = z.object({
  step: z.literal("preview_bookings"),
});

export const onboardingStepRequestSchema = z.discriminatedUnion("step", [
  onboardingRoleTravelSchema,
  onboardingPackageSchema,
  onboardingInvoiceSchema,
  onboardingBankAccountSchema,
  onboardingUsernameSchema,
  onboardingPreviewBookingsSchema,
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
  username?: string;
  onboarding?: OnboardingProgress;
};
