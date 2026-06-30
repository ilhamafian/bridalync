import { z } from "zod";

import { objectIdSchema } from "@/schemas/object-id";
import {
  bookingDraftSchema,
  bookingInvoiceSchema,
} from "@/schemas/booking";

export { bookingInvoiceSchema };

export const bookingRecordSchema = bookingDraftSchema.extend({
  _id: objectIdSchema,
  invoice: bookingInvoiceSchema,
  status: z.enum(["pending", "confirmed", "failed", "enquiry"]),
  createdAt: z.coerce.date(),
});

export type BookingRecord = z.infer<typeof bookingRecordSchema>;

export const publicBookingSchema = bookingRecordSchema.pick({
  _id: true,
  freelancerUsername: true,
  packageId: true,
  sessions: true,
  style: true,
  addOns: true,
  contact: true,
  invoice: true,
  status: true,
  createdAt: true,
});

export type PublicBooking = z.infer<typeof publicBookingSchema>;

export const updateBookingStatusSchema = z.object({
  freelancerUsername: z.string().min(1),
  status: z.enum(["confirmed", "failed"]),
});

export const createBookingRequestSchema = bookingDraftSchema
  .extend({
    intent: z.enum(["booking", "enquiry"]),
  })
  .refine((data) => data.sessions.every((session) => session.location), {
    message: "Each session must have a location",
    path: ["sessions"],
  });
