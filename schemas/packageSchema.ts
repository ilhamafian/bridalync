import { z } from "zod";

export const packageSchema = z.object({
    name: z.string().min(1),
    price: z.number().optional(),
    deposit: z.number().optional(),
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
