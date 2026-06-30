import { z } from "zod";

import { objectIdSchema } from "@/lib/schemas/object-id";

export const freelancerSchema = z.object({
  _id: objectIdSchema,
  username: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.email(),
  password: z.string().min(1),
  mobile: z.string().min(1),
  country_code: z.string().min(1),
  bank_account: z.string().min(1),
});

export type Freelancer = z.infer<typeof freelancerSchema>;

export const publicFreelancerSchema = freelancerSchema.omit({ password: true });

export type PublicFreelancer = z.infer<typeof publicFreelancerSchema>;

export const bookingFreelancerSchema = freelancerSchema.pick({
  username: true,
  name: true,
  role: true,
  mobile: true,
  country_code: true,
}).extend({
  mobile: z.string().min(1).optional(),
  country_code: z.string().min(1).optional(),
});

export type BookingFreelancer = z.infer<typeof bookingFreelancerSchema>;
