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

export const blockedDatesPutSchema = z
  .object({
    date: blockedDateKeySchema.optional(),
    dates: z.array(blockedDateKeySchema).min(1).max(62).optional(),
    blocked: z.boolean(),
  })
  .refine((data) => Boolean(data.date) || Boolean(data.dates?.length), {
    message: "Choose at least one date.",
  });

export type BlockedDate = z.infer<typeof blockedDateSchema>;
export type BlockedDatesPut = z.infer<typeof blockedDatesPutSchema>;
