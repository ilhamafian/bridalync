import { z } from "zod";

import { blockedDateKeySchema } from "./blockedDateSchema";
import { timeSlotSchema } from "./settingSchema";

export const blockedSlotSchema = z.object({
  user_id: z.string().min(1),
  date: blockedDateKeySchema,
  startTime: z.string(),
  endTime: z.string(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export const blockedSlotsPutSchema = z.object({
  date: blockedDateKeySchema,
  slots: z.array(timeSlotSchema).min(1, "Choose at least one slot.").max(48),
  blocked: z.boolean(),
});

export type BlockedSlot = z.infer<typeof blockedSlotSchema>;
export type BlockedSlotsPut = z.infer<typeof blockedSlotsPutSchema>;
