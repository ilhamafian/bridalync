import { z } from "zod";

import { objectIdSchema } from "@/schemas/objectId";

export const userSchema = z.object({
  _id: objectIdSchema,
  email: z.email(),
  password: z.string().min(1),
  onboarding_completed: z.boolean().default(false),
  // filled in later during onboarding
  username: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  mobile: z.string().min(1).optional(),
  country_code: z.string().min(1).optional(),
  bank_account: z.string().min(1).optional(),
});
// What the signup API accepts (only mandatory fields)
export const signupUserSchema = userSchema.pick({
  email: true,
  password: true,
});
// What profile update accepts (all optional except what you require)
export const updateUserSchema = userSchema
  .omit({ _id: true, email: true, password: true })
  .partial();
export type User = z.infer<typeof userSchema>;

export const publicUserSchema = userSchema.omit({ password: true });

export type PublicUser = z.infer<typeof publicUserSchema>;

export const bookingUserSchema = userSchema.pick({
  username: true,
  name: true,
  role: true,
  mobile: true,
  country_code: true,
}).extend({
  mobile: z.string().min(1).optional(),
  country_code: z.string().min(1).optional(),
});

export type BookingUser = z.infer<typeof bookingUserSchema>;
