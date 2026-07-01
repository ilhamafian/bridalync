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

export const invoiceSettingSchema = z.object({
    terms_and_conditions: z.string().default("Testing terms and conditions"),
});

export const bankAccountSettingSchema = z.object({
    bank_name: z.string().default("Test Bank"),
    account_number: z.string().default("1234567890"),
    account_name: z.string().default("Test Account"),
});

export const settingSchema = z.object({
    user_id: z.string(),
    role: z.enum(["hijabstylist", "makeupartist"]),
    link: z.string().default(randomString(7)),
    charge_by: z.enum(["offering", "style"]),
    travel: travelSettingSchema,
    payment: paymentSettingSchema.default(() => paymentSettingSchema.parse({})),
    invoice: invoiceSettingSchema.default(() => invoiceSettingSchema.parse({})),
    bank_account: bankAccountSettingSchema.default(() =>
        bankAccountSettingSchema.parse({})
    ),
});

export type Setting = z.infer<typeof settingSchema>;
export type TravelSetting = z.infer<typeof travelSettingSchema>;
export type PaymentSetting = z.infer<typeof paymentSettingSchema>;
export type InvoiceSetting = z.infer<typeof invoiceSettingSchema>;
export type BankAccountSetting = z.infer<typeof bankAccountSettingSchema>;