import { z } from "zod";

export const bookingSessionSchema = z.object({
  id: z.string().min(1),
  eventType: z.enum(["nikah", "sanding", "corporate"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotId: z.enum(["6-8", "10-12", "14-16", "18-20"]),
  locationId: z
    .enum(["bride-home", "hotel-venue", "mosque", "other"])
    .nullable(),
});

export type BookingSession = z.infer<typeof bookingSessionSchema>;

export const bookingDraftSchema = z.object({
  sessions: z.array(bookingSessionSchema).min(1),
});

export type BookingDraft = z.infer<typeof bookingDraftSchema>;
