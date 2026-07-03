import { z } from "zod";

export const addOnSchema = z.object({
    name: z.string(),
    price: z.number(),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

export type AddOn = z.infer<typeof addOnSchema>;