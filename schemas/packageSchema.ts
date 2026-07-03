import { z } from "zod";

export const packageSchema = z.object({
    name: z.string(),
    price: z.number(),
    deposit: z.number(),
    session_templates: z.array(z.object({
        name: z.string(),
        order: z.number(),
    })),
    user_id: z.string(),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

export type Package = z.infer<typeof packageSchema>;