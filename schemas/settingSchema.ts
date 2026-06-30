import { z } from "zod";

import { addressSchema } from "@/schemas/addressSchema";

export const travelSettingSchema = z.object({
    enabled: z.boolean(),
    rate_per_km: z.number(),
    location: addressSchema,
});

export const paymentSettingSchema = z.object({
    deposit_amount: z.number(),
    balance_due_before: z.number(),
});

export const invoiceSettingSchema = z.object({
    terms_and_conditions: z.string(),
});

export const bankAccountSettingSchema = z.object({
    bank_name: z.string(),
    account_number: z.string(),
    account_name: z.string(),
});

export const settingSchema = z.object({
    role: z.enum(["hijabstylist", "makeupartist"]),
    link: z.string(),
    travel: travelSettingSchema,
    payment: paymentSettingSchema,
    invoice: invoiceSettingSchema,
    bank_account: bankAccountSettingSchema,
});

export type Setting = z.infer<typeof settingSchema>;
export type TravelSetting = z.infer<typeof travelSettingSchema>;
export type PaymentSetting = z.infer<typeof paymentSettingSchema>;
export type InvoiceSetting = z.infer<typeof invoiceSettingSchema>;
export type BankAccountSetting = z.infer<typeof bankAccountSettingSchema>;