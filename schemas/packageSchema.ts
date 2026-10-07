import { z } from "zod";

import { regionPricesSchema } from "@/schemas/settingSchema";

export const packageDayModeSchema = z.enum(["same_day", "different_day"]);

export const packageSessionSchema = z.object({
    name: z.string().trim().min(1),
    order: z.number(),
});

export const packageSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().optional(),
    deposit: z.number().optional(),
    /** Full event price per region, used when travel is charged by region per event. */
    region_prices: regionPricesSchema.optional(),
    /** Missing on events created before multi-session events = one session named after the event. */
    sessions: z.array(packageSessionSchema).min(1).optional(),
    /** Whether every session is on the same date or each on its own date; missing = same day. */
    day_mode: packageDayModeSchema.optional(),
    order: z.number(),
    user_id: z.string(),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

export const packageInputSchema = packageSchema.omit({
    user_id: true,
    created_at: true,
    updated_at: true,
});

export const packageUpdateSchema = packageInputSchema.partial();

export type Package = z.infer<typeof packageSchema>;
export type PackageInput = z.infer<typeof packageInputSchema>;
export type PackageUpdate = z.infer<typeof packageUpdateSchema>;
export type PackageDayMode = z.infer<typeof packageDayModeSchema>;
export type PackageSession = z.infer<typeof packageSessionSchema>;
