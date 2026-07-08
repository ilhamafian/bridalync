import { z } from "zod";

import { addressSchema } from "@/schemas/addressSchema";

const hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const travelSettingSchema = z.object({
    enabled: z.boolean(),
    rate_per_km: z.number(),
    location: addressSchema,
});

export const paymentSettingSchema = z.object({
    balance_due_before: z.number().default(3),
});


export const bankAccountSettingSchema = z.object({
    bank_name: z.string().default("Test Bank"),
    account_number: z.string().default("1234567890"),
    account_name: z.string().default("Test Account"),
});

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

export const timeSlotSchema = z.object({
  startTime: z.string().regex(hhmm, "Expected HH:mm"),
  endTime: z.string().regex(hhmm, "Expected HH:mm"),
})
.refine(
  ({ startTime, endTime }) => startTime < endTime,
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);

export const DEFAULT_TIME_SLOTS = [
  { startTime: "06:00", endTime: "08:00" },
  { startTime: "10:00", endTime: "12:00" },
  { startTime: "14:00", endTime: "16:00" },
  { startTime: "18:00", endTime: "20:00" },
] as const;

export const timeSlotSettingSchema = z
  .array(timeSlotSchema)
  .default(() => DEFAULT_TIME_SLOTS.map((slot) => ({ ...slot })));

export const settingSchema = z.object({
    user_id: z.string(),
    charge_by: z.enum(["package", "style"]),
    travel: travelSettingSchema,
    payment: paymentSettingSchema.default(() => paymentSettingSchema.parse({})),
    bank_account: bankAccountSettingSchema.default(() =>
        bankAccountSettingSchema.parse({})
    ),
    invoice: invoiceSettingSchema.default(() => invoiceSettingSchema.parse({})),
    time_slots: timeSlotSettingSchema,
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

/** Partial updates must not apply parent `.default()` values (e.g. invoice on bank-only saves). */
export const settingUpdateSchema = z.object({
    charge_by: settingSchema.shape.charge_by.optional(),
    travel: travelSettingSchema.partial().optional(),
    payment: paymentSettingSchema.partial().optional(),
    bank_account: bankAccountSettingSchema.partial().optional(),
    invoice: invoiceSettingSchema.partial().optional(),
    time_slots: z.array(timeSlotSchema).optional(),
});

export const publicSettingSchema = settingSchema
    .omit({ bank_account: true })
    .extend({
        // Client-safe: avoid importing MongoDB ObjectId schema into browser bundle.
        // API routes may still return ObjectId; accept unknown here and normalize at boundaries.
        _id: z.unknown().optional(),
    });

export type Setting = z.infer<typeof settingSchema>;
export type SettingUpdate = z.infer<typeof settingUpdateSchema>;
export type PublicSetting = z.infer<typeof publicSettingSchema>;
export type TravelSetting = z.infer<typeof travelSettingSchema>;
export type PaymentSetting = z.infer<typeof paymentSettingSchema>;
export type BankAccountSetting = z.infer<typeof bankAccountSettingSchema>;
export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type TimeSlotSetting = z.infer<typeof timeSlotSettingSchema>;