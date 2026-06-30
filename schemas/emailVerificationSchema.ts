import { z } from "zod";

export const emailVerificationSchema = z.object({
  email: z.email(),
  code_hash: z.string().min(1),
  expires_at: z.coerce.date(),
  created_at: z.coerce.date(),
});

export type EmailVerification = z.infer<typeof emailVerificationSchema>;
