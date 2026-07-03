import { z } from "zod";

import { addressSchema } from "@/schemas/addressSchema";
import { timeSlotSchema } from "./settingSchema";

export const sessionSchema = z.object({
    status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]),
    name: z.string(),
    style: z.string().optional(),
    style_variation: z.string().optional(),
    order: z.number(),
    date: z.coerce.date(),
    time_slot: timeSlotSchema,
    location: addressSchema,
});

export type Session = z.infer<typeof sessionSchema>;

/** In-progress session while the client fills the booking form */
export const sessionFormSchema = sessionSchema
    .omit({ location: true })
    .extend({
        client_key: z.string(),
        location: addressSchema.optional(),
    });

export type SessionForm = z.infer<typeof sessionFormSchema>;

export function toDbSession(form: SessionForm): Session {
    const { client_key: _clientKey, ...rest } = form;
    return sessionSchema.parse(rest);
}