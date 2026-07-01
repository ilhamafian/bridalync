import { z } from "zod";

import { addressSchema } from "@/schemas/addressSchema";
import { randomString } from "@/utils/utils";

export const travelSettingSchema = z.object({
    enabled: z.boolean(),
    rate_per_km: z.number(),
    location: addressSchema,
});

export const paymentSettingSchema = z.object({
    deposit_amount: z.number().default(50),
    balance_due_before: z.number().default(3),
});


export const bankAccountSettingSchema = z.object({
    bank_name: z.string().default("Test Bank"),
    account_number: z.string().default("1234567890"),
    account_name: z.string().default("Test Account"),
});

export const DEFAULT_TERMS_AND_CONDITIONS = `Booking deposit:
A non-refundable booking deposit of RM50/slot for bawal/shawl styling or RM100/slot for turkish styling is required as soon as possible to secure slot.

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

export const settingSchema = z.object({
    user_id: z.string(),
    role: z.enum(["hijabstylist", "makeupartist"]),
    charge_by: z.enum(["package", "style"]),
    travel: travelSettingSchema,
    payment: paymentSettingSchema.default(() => paymentSettingSchema.parse({})),
    bank_account: bankAccountSettingSchema.default(() =>
        bankAccountSettingSchema.parse({})
    ),
    invoice: invoiceSettingSchema.default(() => invoiceSettingSchema.parse({})),
});

/** Partial updates must not apply parent `.default()` values (e.g. invoice on bank-only saves). */
export const settingUpdateSchema = z.object({
    role: settingSchema.shape.role.optional(),
    charge_by: settingSchema.shape.charge_by.optional(),
    travel: travelSettingSchema.partial().optional(),
    payment: paymentSettingSchema.partial().optional(),
    bank_account: bankAccountSettingSchema.partial().optional(),
    invoice: invoiceSettingSchema.partial().optional(),
});

export type Setting = z.infer<typeof settingSchema>;
export type SettingUpdate = z.infer<typeof settingUpdateSchema>;
export type TravelSetting = z.infer<typeof travelSettingSchema>;
export type PaymentSetting = z.infer<typeof paymentSettingSchema>;
export type BankAccountSetting = z.infer<typeof bankAccountSettingSchema>;