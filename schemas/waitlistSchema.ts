import { z } from "zod";

import { objectIdSchema } from "./objectId";

export const waitlistInputSchema = z.object({
  country_code: z.string().min(1, "Country code is required"),
  mobile: z
    .string()
    .min(1, "Phone number is required")
    .transform((value) => value.replace(/\D/g, "").replace(/^0+/, ""))
    .refine((digits) => digits.length >= 8 && digits.length <= 15, {
      message: "Enter a valid phone number",
    }),
});

export const waitlistSchema = z.object({
  _id: objectIdSchema.optional(),
  country_code: z.string().min(1),
  mobile: z.string().min(8).max(15),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type WaitlistInput = z.infer<typeof waitlistInputSchema>;
export type WaitlistEntry = z.infer<typeof waitlistSchema>;
