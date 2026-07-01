import { z } from "zod";
import { addressSchema } from "./addressSchema";
import { objectIdSchema } from "./objectId";


export const userSchema = z.object({
  _id: objectIdSchema.optional(),
  email: z.email(),
  password: z.string().min(1),
  onboarding_completed: z.boolean().default(false),
  // filled in later during onboarding
  username: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  mobile: z.string().min(1).optional(),
  country_code: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
});

export const onboardingRequestSchema = z.object({
  role: z.enum(["hijabstylist", "makeupartist"]),
  charge_by: z.enum(["offering", "style"]),
  travel: z.discriminatedUnion("enabled", [
    z.object({ enabled: z.literal(false) }),
    z.object({
      enabled: z.literal(true),
      rate_per_km: z.number().min(0),
      location: addressSchema,
    }),
  ]),
});

export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>;

// What the signup API accepts (only mandatory fields)
export const signupUserSchema = userSchema.pick({
  email: true,
  password: true,
});
// What profile update accepts (all optional except what you require)
export const updateUserSchema = userSchema
  .omit({ email: true, password: true })
  .partial();

export const publicUserSchema = userSchema.omit({ password: true });

export type PublicUser = z.infer<typeof publicUserSchema>;
export type User = z.infer<typeof userSchema>;

export type SignupUser = z.infer<typeof signupUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;