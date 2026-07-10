import { z } from "zod";

import { addressSchema } from "@/schemas/addressSchema";
import { sessionSchema } from "@/schemas/sessionSchema";
import { timeSlotSchema } from "@/schemas/settingSchema";

export const bookingContactSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  mobile: z.string().optional(),
  country_code: z.string().optional(),
});

export const quotationSummarySchema = z.object({
  lineItems: z.array(
    z.object({
      label: z.string(),
      amountRm: z.number(),
    })
  ),
  totalRm: z.number(),
  depositRm: z.number(),
  balanceRm: z.number(),
});

export const bookingSessionSchema = sessionSchema.extend({
  client_key: z.string().optional(),
});

export const bookingSchema = z.object({
  _id: z.unknown().optional(),
  freelancerUsername: z.string(),
  freelancerUserId: z.string(),
  contact: bookingContactSchema,
  packageId: z.string(),
  packageName: z.string(),
  styleId: z.string().nullish(),
  styleName: z.string().nullish(),
  addOnIds: z.array(z.string()),
  sessions: z.array(bookingSessionSchema),
  invoice: quotationSummarySchema,
  paymentOption: z.enum(["deposit", "full"]).default("deposit"),
  status: z.enum([
    "pending",
    "confirmed",
    "completed",
    "failed",
    "enquiry",
    "cancelled",
  ]),
  stripeCheckoutSessionId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  /** Keys of sessions that already received an upcoming-session push. */
  sessionRemindersSent: z.array(z.string()).optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Booking = z.infer<typeof bookingSchema>;

/** Booking loaded from the database — always has an `_id`. */
export type PersistedBooking = Booking & { _id: unknown };

const bookingLineItemInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  deposit: z.number().optional(),
  categoryName: z.string().optional(),
});

const bookingSessionInputSchema = z.object({
  client_key: z.string(),
  status: z.literal("scheduled"),
  name: z.string(),
  order: z.number(),
  date: z.coerce.date(),
  time_slot: timeSlotSchema,
  location: addressSchema,
});

export const createBookingRequestSchema = z.object({
  freelancerUsername: z.string().min(1),
  intent: z.enum(["booking", "enquiry"]).default("booking"),
  contact: bookingContactSchema,
  packageId: z.string().min(1),
  style: bookingLineItemInputSchema.optional(),
  addOns: z.array(bookingLineItemInputSchema).default([]),
  sessions: z.array(bookingSessionInputSchema).min(1),
  distanceKmBySessionKey: z.record(z.string(), z.number()).optional(),
  paymentOption: z.enum(["deposit", "full"]).default("deposit"),
});

export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>;

export const publicBookingFreelancerSchema = z.object({
  name: z.string(),
  mobile: z.string(),
  country_code: z.string(),
});

export const publicBookingSchema = bookingSchema
  .omit({
    freelancerUserId: true,
    stripeCheckoutSessionId: true,
    stripePaymentIntentId: true,
  })
  .extend({
    _id: z.string(),
    freelancer: publicBookingFreelancerSchema.optional(),
  });

export type PublicBookingFreelancer = z.infer<typeof publicBookingFreelancerSchema>;
export type PublicBooking = z.infer<typeof publicBookingSchema>;

export function toPublicBooking(
  booking: PersistedBooking,
  freelancer?: PublicBookingFreelancer | null
): PublicBooking {
  const { freelancerUserId, stripeCheckoutSessionId, stripePaymentIntentId, ...rest } =
    booking;

  const id =
    typeof booking._id === "string"
      ? booking._id
      : (booking._id as { toString(): string }).toString();

  return publicBookingSchema.parse({
    ...rest,
    _id: id,
    ...(freelancer ? { freelancer } : {}),
  });
}

export const updateBookingStatusSchema = z.object({
  freelancerUsername: z.string().min(1),
  status: z.enum(["pending", "confirmed", "failed", "cancelled"]),
});

export const bookingStatusSchema = bookingSchema.shape.status;

export const manualBookingInputSchema = z.object({
  contact: bookingContactSchema,
  packageId: z.string().min(1),
  style: bookingLineItemInputSchema.optional(),
  addOns: z.array(bookingLineItemInputSchema).default([]),
  sessions: z.array(bookingSessionInputSchema).min(1),
  distanceKmBySessionKey: z.record(z.string(), z.number()).optional(),
  paymentOption: z.enum(["deposit", "full"]).default("deposit"),
  status: bookingStatusSchema.default("confirmed"),
});

export type ManualBookingInput = z.infer<typeof manualBookingInputSchema>;

export const dashboardBookingUpdateSchema = manualBookingInputSchema.partial().extend({
  contact: bookingContactSchema.optional(),
  sessions: z.array(bookingSessionInputSchema).min(1).optional(),
});

export type DashboardBookingUpdate = z.infer<typeof dashboardBookingUpdateSchema>;
