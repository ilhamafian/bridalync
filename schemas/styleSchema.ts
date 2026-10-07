import { z } from "zod";

import { depositTypeSchema } from "@/schemas/packageSchema";

export const styleVariantSchema = z.object({
    name: z.string().min(1),
    order: z.number(),
    image_url: z.string().optional(),
    price: z.number(),
    deposit: z.number(),
    deposit_type: depositTypeSchema.optional(),
});

export const styleSchema = z.object({
    user_id: z.string(),
    name: z.string().min(1),
    order: z.number(),
    variants: z.array(styleVariantSchema),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

export const styleInputSchema = styleSchema.omit({
    user_id: true,
    created_at: true,
    updated_at: true,
});

export const styleUpdateSchema = styleInputSchema.partial();

export type Style = z.infer<typeof styleSchema>;
export type StyleInput = z.infer<typeof styleInputSchema>;
export type StyleUpdate = z.infer<typeof styleUpdateSchema>;
