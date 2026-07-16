import { z } from "zod";

export const passwordResetSchema = z.object({
  email: z.email(),
  code_hash: z.string().min(1),
  expires_at: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
});

export type PasswordReset = z.infer<typeof passwordResetSchema>;
