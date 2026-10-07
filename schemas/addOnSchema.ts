import { z } from "zod";

export const addOnSchema = z.object({
    user_id: z.string(),
    name: z.string().min(1),
    description: z.string().max(500).optional(),
    order: z.number(),
    price: z.number().min(0),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

export const addOnInputSchema = addOnSchema.omit({
    user_id: true,
    created_at: true,
    updated_at: true,
});

export const addOnUpdateSchema = addOnInputSchema.partial();

export type AddOn = z.infer<typeof addOnSchema>;
export type AddOnInput = z.infer<typeof addOnInputSchema>;
export type AddOnUpdate = z.infer<typeof addOnUpdateSchema>;
