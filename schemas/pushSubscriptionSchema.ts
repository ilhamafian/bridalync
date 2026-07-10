import { z } from "zod";

import { objectIdSchema } from "./objectId";

export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const pushSubscriptionSchema = z.object({
  _id: objectIdSchema.optional(),
  userId: z.string().min(1),
  endpoint: z.url(),
  keys: pushSubscriptionKeysSchema,
  expirationTime: z.number().nullable().optional(),
  userAgent: z.string().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export const pushSubscriptionInputSchema = z.object({
  endpoint: z.url(),
  keys: pushSubscriptionKeysSchema,
  expirationTime: z.number().nullable().optional(),
});

export type PushSubscriptionRecord = z.infer<typeof pushSubscriptionSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInputSchema>;
