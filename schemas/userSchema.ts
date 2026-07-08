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
  onboardingInvoiceSchema,
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

export const deferredOnboardingSchema = z.object({
  has_minimal_account: z.boolean().default(false),
  pending_earnings: z.number().default(0),
  earnings_count: z.number().default(0),
  onboarding_notifications: z.boolean().default(false),
});

export const defaultDeferredOnboarding = (): z.infer<
  typeof deferredOnboardingSchema
> => deferredOnboardingSchema.parse({});

export type DeferredOnboarding = z.infer<typeof deferredOnboardingSchema>;

export const userSchema = z.object({
  _id: objectIdSchema.optional(),
  email: z.email(),
  password: z.string().min(1),
  // filled in later during onboarding
  username: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["hijabstylist", "makeupartist"]).optional(),
  mobile: z.string().min(1).optional(),
  country_code: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  stripe_account_id: z.string().optional(),
  is_stripe_connected: z.boolean().default(false),
  deferred_onboarding: deferredOnboardingSchema.default(() =>
    defaultDeferredOnboarding()
  ),
  onboarding: onboardingProgressSchema.default(() => defaultOnboardingProgress()),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
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
    deferred_onboarding: deferredOnboardingSchema.partial().optional(),
  })
  .partial();

export const publicUserSchema = userSchema.omit({ password: true, onboarding: true });

// Server/session-safe user: keep onboarding (no password).
export const sessionUserSchema = userSchema.omit({ password: true });

export type PublicUser = z.infer<typeof publicUserSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type User = z.infer<typeof userSchema>;

export type SignupUser = z.infer<typeof signupUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
