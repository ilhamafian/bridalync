import { z } from "zod";

export const emailVerificationSchema = z.object({
  // May be a normal email or a namespaced key (e.g. admin:user@domain.com).
  email: z.string().min(1),
  code_hash: z.string().min(1),
  expires_at: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
});

export type EmailVerification = z.infer<typeof emailVerificationSchema>;
