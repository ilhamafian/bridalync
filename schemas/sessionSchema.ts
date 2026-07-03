import { z } from "zod";

import { addressSchema } from "@/schemas/addressSchema";
import { timeSlotSchema } from "./settingSchema";

export const sessionSchema = z.object({
    status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]),
    name: z.string(),
    style: z.string().optional(),
    style_variation: z.string().optional(),
    order: z.number(),
    date: z.date(),
    time_slot: timeSlotSchema,
    location: addressSchema,
});

export type Session = z.infer<typeof sessionSchema>;