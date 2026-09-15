import { z } from "zod";

export const blockedDateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const blockedDateSchema = z.object({
  user_id: z.string().min(1),
  date: blockedDateKeySchema,
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export const blockedDatesPutSchema = z.object({
  date: blockedDateKeySchema,
  blocked: z.boolean(),
});

export type BlockedDate = z.infer<typeof blockedDateSchema>;
export type BlockedDatesPut = z.infer<typeof blockedDatesPutSchema>;
