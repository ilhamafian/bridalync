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

export const socialLinksSchema = z.object({
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
});

export type SocialLinks = z.infer<typeof socialLinksSchema>;

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
  profile_photo_url: z.string().optional(),
  social_links: socialLinksSchema.optional(),
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

/** Safe fields exposed on the public booking / profile page. */
export const publicProfileSchema = z.object({
  name: z.string().optional(),
  username: z.string().optional(),
  role: z.enum(["hijabstylist", "makeupartist"]).optional(),
  profile_photo_url: z.string().optional(),
  mobile: z.string().optional(),
  country_code: z.string().optional(),
  social_links: socialLinksSchema.optional(),
});

// Server/session-safe user: keep onboarding (no password).
export const sessionUserSchema = userSchema.omit({ password: true });

export type PublicUser = z.infer<typeof publicUserSchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type User = z.infer<typeof userSchema>;

export type SignupUser = z.infer<typeof signupUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

const optionalSocialUrl = z.string().trim().max(300);

/** Dashboard profile edits — excludes email/password and internal fields. */
export const profileUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-z0-9_-]+$/i, "Use letters, numbers, hyphens, or underscores."),
  mobile: z.string().min(1, "Phone number is required"),
  country_code: z.string().min(1, "Country code is required"),
  profile_photo_url: z.string().trim().max(2000).optional(),
  social_links: z
    .object({
      instagram: optionalSocialUrl.optional(),
      tiktok: optionalSocialUrl.optional(),
    })
    .optional(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/** Photo-only update — saved immediately on upload without the full profile form. */
export const profilePhotoUpdateSchema = z.object({
  profile_photo_url: z.string().trim().max(2000),
});

export type ProfilePhotoUpdate = z.infer<typeof profilePhotoUpdateSchema>;

export function toPublicProfile(user: User): PublicProfile {
  return publicProfileSchema.parse({
    name: user.name,
    username: user.username,
    role: user.role,
    profile_photo_url: user.profile_photo_url,
    mobile: user.mobile,
    country_code: user.country_code,
    social_links: user.social_links
      ? {
          instagram: user.social_links.instagram,
          tiktok: user.social_links.tiktok,
        }
      : undefined,
  });
}

/** Normalize empty strings out of social_links before persist. */
export function normalizeSocialLinks(
  links: ProfileUpdate["social_links"] | SocialLinks | undefined
): SocialLinks | undefined {
  if (!links) return undefined;

  const cleaned: SocialLinks = {};
  for (const key of ["instagram", "tiktok"] as const) {
    const value = links[key]?.trim();
    if (value) cleaned[key] = value;
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
