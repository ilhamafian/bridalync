import { z } from "zod";

import { addressSchema } from "@/schemas/addressSchema";

const hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const MALAYSIA_REGION_IDS = [
  "klang_valley",
  "negeri_sembilan",
  "melaka",
  "johor",
  "perak",
  "pahang",
  "kedah",
  "penang",
  "perlis",
  "kelantan",
  "terengganu",
  "sabah",
  "sarawak",
  "labuan",
] as const;

export const regionIdSchema = z.enum(MALAYSIA_REGION_IDS);

/** Price per region; a missing region isn't served. */
export const regionPricesSchema = z.partialRecord(
  regionIdSchema,
  z.number().min(0)
);

export const travelModeSchema = z.enum(["distance", "region"]);
export const travelRegionModeSchema = z.enum(["fixed", "per_event"]);

export const travelSettingSchema = z.object({
  enabled: z.boolean(),
  /** Missing = distance. */
  mode: travelModeSchema.optional(),
  rate_per_km: z.number(),
  /** Replaces `rate_per_km` for the whole trip beyond `LONG_DISTANCE_THRESHOLD_KM`; unset = same rate. */
  long_distance_rate_per_km: z.number().min(0).optional(),
  /** Base for distance mode; region mode keeps whatever is stored. */
  location: addressSchema,
  /** Region mode: one price list (`fixed`) or one per event (`per_event`, package mode only). Missing = fixed. */
  region_mode: travelRegionModeSchema.optional(),
  region_prices: regionPricesSchema.optional(),
});

export const paymentMethodSchema = z.enum([
  "manual_transfer",
  "payment_gateway",
]);

export const paymentSettingSchema = z.object({
  balance_due_before: z.number().default(3),
  method: paymentMethodSchema.default("manual_transfer"),
  qr_image_url: z.string().optional(),
  payee_name: z.string().optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
});

export function hasManualTransferDetails(
  payment: Pick<
    z.infer<typeof paymentSettingSchema>,
    "qr_image_url" | "payee_name" | "bank_name" | "account_number"
  >
): boolean {
  return Boolean(
    payment.qr_image_url?.trim() &&
      payment.payee_name?.trim() &&
      payment.bank_name?.trim() &&
      payment.account_number?.trim()
  );
}

export type ManualTransferDetails = {
  qrImageUrl: string;
  payeeName: string;
  bankName: string;
  accountNumber: string;
};

export function toManualTransferDetails(
  payment: Pick<
    z.infer<typeof paymentSettingSchema>,
    "qr_image_url" | "payee_name" | "bank_name" | "account_number"
  >
): ManualTransferDetails | null {
  if (!hasManualTransferDetails(payment)) return null;
  return {
    qrImageUrl: payment.qr_image_url!.trim(),
    payeeName: payment.payee_name!.trim(),
    bankName: payment.bank_name!.trim(),
    accountNumber: payment.account_number!.trim(),
  };
}

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const DEFAULT_TERMS_AND_CONDITIONS = `Booking deposit:
A non-refundable booking deposit is required to secure slot.

Balance payment:
The remaining amount must be fully settled no later than 3 days before the event date.

Booking cancellation:
If the client(s) cancels after paying the booking deposit, the deposit is non-refundable and will be forfeited.

If full payment has been made and the client(s) cancels, no refund will be issued. However client(s) are allowed to change the slot to any date available.

Date change policy:
Client(s) are allowed to change the event date, however any changes is subject to availability and must be discussed with stylist.`;

export const invoiceSettingSchema = z.object({
  terms_and_conditions: z.string().default(DEFAULT_TERMS_AND_CONDITIONS),
  company_name: z.string().default("Test Company"),
  company_registration_number: z.string().default("1234567890").optional(),
  company_logo: z.string().optional(),
});

export const messageSettingSchema = z.object({
  /** WhatsApp "Leave Review" template; blank/unset = `DEFAULT_REVIEW_REQUEST_TEMPLATE`. */
  review_request: z.string().max(1000).optional(),
});

export const timeOfDaySchema = z.string().regex(hhmm, "Expected HH:mm");

export const timeSlotSchema = z
  .object({
    startTime: z.string().regex(hhmm, "Expected HH:mm"),
    endTime: z.string().regex(hhmm, "Expected HH:mm"),
  })
  .refine(({ startTime, endTime }) => startTime < endTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const MUA_TIME_SLOTS = [
  { startTime: "06:00", endTime: "08:00" },
  { startTime: "10:00", endTime: "12:00" },
  { startTime: "14:00", endTime: "16:00" },
  { startTime: "18:00", endTime: "20:00" },
] as const;
export const HS_TIME_SLOTS = [
  { startTime: "07:00", endTime: "08:00" },
  { startTime: "09:00", endTime: "10:00" },
  { startTime: "11:00", endTime: "12:00" },
  { startTime: "17:00", endTime: "18:00" },
  { startTime: "19:00", endTime: "20:00" },
] as const;
export const timeSlotSettingSchema = z
  .array(timeSlotSchema)
  .default(() => MUA_TIME_SLOTS.map((slot) => ({ ...slot })));

export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type TimeSlotSetting = z.infer<typeof timeSlotSettingSchema>;

export function getDefaultTimeSlots(
  chargeBy: "package" | "style"
): TimeSlot[] {
  const slots = chargeBy === "style" ? HS_TIME_SLOTS : MUA_TIME_SLOTS;
  return slots.map((slot) => ({ ...slot }));
}

const bookingUntilSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const settingSchema = z.object({
  user_id: z.string(),
  charge_by: z.enum(["package", "style"]),
  travel: travelSettingSchema,
  payment: paymentSettingSchema.default(() => paymentSettingSchema.parse({})),
  invoice: invoiceSettingSchema.default(() => invoiceSettingSchema.parse({})),
  time_slots: timeSlotSettingSchema,
  messages: messageSettingSchema.optional(),
  /** Legacy: highest calendar year clients may book. Superseded by `booking_until`. */
  max_booking_year: z.number().int().optional(),
  /** Last date (YYYY-MM-DD, inclusive) clients may book. Unset = 31 Dec of `max_booking_year`. */
  booking_until: bookingUntilSchema.optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

/** Partial updates must not apply parent `.default()` values (e.g. invoice on payment-only saves). */
export const settingUpdateSchema = z.object({
  charge_by: settingSchema.shape.charge_by.optional(),
  travel: travelSettingSchema
    .partial()
    .extend({
      /** `null` clears it. */
      long_distance_rate_per_km: z.number().min(0).nullable().optional(),
    })
    .optional(),
  payment: paymentSettingSchema.partial().optional(),
  invoice: invoiceSettingSchema.partial().optional(),
  time_slots: z.array(timeSlotSchema).optional(),
  messages: messageSettingSchema.partial().optional(),
  max_booking_year: z.number().int().optional(),
  booking_until: bookingUntilSchema.optional(),
});

export const publicSettingSchema = settingSchema.extend({
  // Client-safe: avoid importing MongoDB ObjectId schema into browser bundle.
  // API routes may still return ObjectId; accept unknown here and normalize at boundaries.
  _id: z.unknown().optional(),
});

export type Setting = z.infer<typeof settingSchema>;
export type SettingUpdate = z.infer<typeof settingUpdateSchema>;
export type PublicSetting = z.infer<typeof publicSettingSchema>;
export type TravelSetting = z.infer<typeof travelSettingSchema>;
export type TravelMode = z.infer<typeof travelModeSchema>;
export type TravelRegionMode = z.infer<typeof travelRegionModeSchema>;
export type RegionId = z.infer<typeof regionIdSchema>;
export type RegionPrices = z.infer<typeof regionPricesSchema>;
export type PaymentSetting = z.infer<typeof paymentSettingSchema>;
export type InvoiceSetting = z.infer<typeof invoiceSettingSchema>;
export type MessageSetting = z.infer<typeof messageSettingSchema>;
