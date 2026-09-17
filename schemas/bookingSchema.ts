import { z } from "zod";

import { addressSchema } from "@/schemas/addressSchema";
import { sessionSchema } from "@/schemas/sessionSchema";
import {
  type ManualTransferDetails,
  timeSlotSchema,
} from "@/schemas/settingSchema";

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

export const paymentChannelSchema = z.enum([
  "manual_transfer",
  "payment_gateway",
]);

export const paymentVerificationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export const bookingSchema = z.object({
  _id: z.unknown().optional(),
  freelancerUsername: z.string(),
  freelancerUserId: z.string(),
  contact: bookingContactSchema,
  packageIds: z.array(z.string()).default([]),
  packageNames: z.string(),
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
  source: z.enum(["bridalync", "google_calendar"]).default("bridalync"),
  googleEventId: z.string().min(1).optional(),
  paymentChannel: paymentChannelSchema.optional(),
  depositReceiptUrl: z.string().optional(),
  depositVerificationStatus: paymentVerificationStatusSchema.optional(),
  balanceReceiptUrl: z.string().optional(),
  balanceVerificationStatus: paymentVerificationStatusSchema.optional(),
  stripeCheckoutSessionId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  /** Keys of sessions that already received an upcoming-session push. */
  sessionRemindersSent: z.array(z.string()).optional(),
  /** When the client was emailed a balance-due reminder. */
  balanceReminderSentAt: z.coerce.date().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Booking = z.infer<typeof bookingSchema>;

/** Booking loaded from the database — always has an `_id`. */
export type PersistedBooking = Booking & { _id: unknown };

export const bookingLineItemInputSchema = z.object({
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
  packageId: z.string().min(1),
  order: z.number(),
  date: z.coerce.date(),
  time_slot: timeSlotSchema,
  location: addressSchema,
  style: bookingLineItemInputSchema.optional(),
});

export const createBookingRequestSchema = z.object({
  freelancerUsername: z.string().min(1),
  intent: z.enum(["booking", "enquiry"]).default("booking"),
  contact: bookingContactSchema,
  packageIds: z.array(z.string()).min(1),
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
    sessionRemindersSent: true,
    balanceReminderSentAt: true,
  })
  .extend({
    _id: z.string(),
    freelancer: publicBookingFreelancerSchema.optional(),
    stylistPaymentMethod: paymentChannelSchema.optional(),
    manualTransfer: z
      .object({
        qrImageUrl: z.string(),
        payeeName: z.string(),
        bankName: z.string(),
        accountNumber: z.string(),
      })
      .optional(),
  });

export type PublicBookingFreelancer = z.infer<typeof publicBookingFreelancerSchema>;
export type PublicBooking = z.infer<typeof publicBookingSchema>;

export function toPublicBooking(
  booking: PersistedBooking,
  freelancer?: PublicBookingFreelancer | null,
  stylistPaymentMethod?: z.infer<typeof paymentChannelSchema> | null,
  manualTransfer?: ManualTransferDetails | null
): PublicBooking {
  const {
    freelancerUserId,
    stripeCheckoutSessionId,
    stripePaymentIntentId,
    sessionRemindersSent,
    balanceReminderSentAt,
    ...rest
  } = booking;

  const id =
    typeof booking._id === "string"
      ? booking._id
      : (booking._id as { toString(): string }).toString();

  return publicBookingSchema.parse({
    ...rest,
    _id: id,
    ...(freelancer ? { freelancer } : {}),
    ...(stylistPaymentMethod
      ? { stylistPaymentMethod }
      : {}),
    ...(manualTransfer ? { manualTransfer } : {}),
  });
}

export const updateBookingStatusSchema = z.object({
  freelancerUsername: z.string().min(1),
  status: z.enum(["pending", "confirmed", "failed", "cancelled"]),
});

export const bookingStatusSchema = bookingSchema.shape.status;

export const manualBookingInputSchema = z.object({
  contact: bookingContactSchema,
  packageIds: z.array(z.string()).min(1),
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
