import { z } from "zod";

import { addressSchema } from "@/schemas/addressSchema";
import { regionIdSchema, timeOfDaySchema, timeSlotSchema } from "./settingSchema";

export const sessionSchema = z.object({
    status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]),
    name: z.string(),
    packageId: z.string().min(1),
    styleId: z.string().optional(),
    styleName: z.string().optional(),
    order: z.number(),
    date: z.coerce.date(),
    /** Merged span when the session covers several consecutive slots. */
    time_slot: timeSlotSchema,
    /** Consecutive slots covered by `time_slot`; missing = 1. Each slot is charged the session price. */
    slot_count: z.number().int().min(1).optional(),
    /** HH:mm the client must be ready by; required on public bookings, missing on older/imported ones. */
    ready_by: timeOfDaySchema.optional(),
    /** Optional for Google Calendar imports; stylists add it later from the dashboard. */
    location: addressSchema.optional(),
    /** Venue's state, set server-side when it was looked up (`null` = outside every region). */
    region: regionIdSchema.nullable().optional(),
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
