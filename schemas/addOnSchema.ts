import { z } from "zod";

export const addOnSchema = z.object({
    user_id: z.string(),
    name: z.string(),
    order: z.number(),
    price: z.number(),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

export type AddOn = z.infer<typeof addOnSchema>;