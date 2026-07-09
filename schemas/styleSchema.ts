import { z } from "zod";

export const styleSchema = z.object({
    user_id: z.string(),
    name: z.string(),
    order: z.number(),
    variants: z.array(z.object({
        name: z.string(),
        order: z.number(),
        image_url: z.string().optional(),
        price: z.number(),
        deposit: z.number(),
    })),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

export type Style = z.infer<typeof styleSchema>;