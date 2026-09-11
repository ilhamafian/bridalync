import { z } from "zod";

import { objectIdSchema } from "./objectId";

export const betaAllowlistSchema = z.object({
  _id: objectIdSchema.optional(),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type BetaAllowlistEntry = z.infer<typeof betaAllowlistSchema>;
