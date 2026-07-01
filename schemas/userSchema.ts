import { z } from "zod";

import {
  defaultOnboardingProgress,
  onboardingProgressSchema,
} from "./onboardingSchema";
import { objectIdSchema } from "./objectId";

export {
  defaultOnboardingProgress,
  getOnboardingResumeStep,
  isInitialOnboardingComplete,
  isOnboardingComplete,
  ONBOARDING_STEP_ORDER,
  onboardingBankAccountSchema,
  onboardingInvoiceSchema,
  onboardingPreviewBookingsSchema,
  onboardingProgressSchema,
  onboardingRequestSchema,
  onboardingRoleTravelSchema,
  onboardingStepRequestSchema,
  onboardingUsernameSchema,
  type OnboardingProgress,
  type OnboardingRequest,
  type OnboardingStepId,
  type OnboardingStepRequest,
  type OnboardingUser,
} from "./onboardingSchema";

export const userSchema = z.object({
  _id: objectIdSchema.optional(),
  email: z.email(),
  password: z.string().min(1),
  // filled in later during onboarding
  username: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  mobile: z.string().min(1).optional(),
  country_code: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  onboarding: onboardingProgressSchema.default(() => defaultOnboardingProgress()),
});

export const userOnboardingSchema = userSchema;

// What the signup API accepts (only mandatory fields)
export const signupUserSchema = userSchema.pick({
  email: true,
  password: true,
});
// What profile update accepts (all optional except what you require)
export const updateUserSchema = userSchema
  .omit({ email: true, password: true, onboarding: true })
  .extend({
    onboarding: onboardingProgressSchema.partial().optional(),
  })
  .partial();

export const publicUserSchema = userSchema.omit({ password: true });

export type PublicUser = z.infer<typeof publicUserSchema>;
export type User = z.infer<typeof userSchema>;

export type SignupUser = z.infer<typeof signupUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
