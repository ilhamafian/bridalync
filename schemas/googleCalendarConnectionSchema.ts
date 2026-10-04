import { z } from "zod";

/** One per user; tokens are AES-GCM encrypted with `AUTH_SECRET` (see `utils/google/oauth.ts`). */
export const googleCalendarConnectionSchema = z.object({
  user_id: z.string().min(1),
  /** Google account address (the primary calendar id); null if Google didn't share it. */
  google_email: z.string().nullable().optional(),
  refresh_token_enc: z.string().min(1),
  access_token_enc: z.string().optional(),
  access_token_expires_at: z.coerce.date().optional(),
  scopes: z.array(z.string()),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type GoogleCalendarConnection = z.infer<
  typeof googleCalendarConnectionSchema
>;
