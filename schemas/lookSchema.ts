import { z } from "zod";

import { styleVariantSchema } from "@/schemas/styleSchema";

export const MAX_LOOK_VARIANT_IMAGES = 5;

/** Same as a style variant, but with up to `MAX_LOOK_VARIANT_IMAGES` photos instead of one. */
export const lookVariantSchema = styleVariantSchema.omit({ image_url: true }).extend({
    image_urls: z.array(z.string().min(1)).max(MAX_LOOK_VARIANT_IMAGES).default([]),
});

/** Makeup artists' equivalent of a style category. */
export const lookSchema = z.object({
    user_id: z.string(),
    name: z.string().min(1),
    order: z.number(),
    variants: z.array(lookVariantSchema),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

export const lookInputSchema = lookSchema.omit({
    user_id: true,
    created_at: true,
    updated_at: true,
});

export const lookUpdateSchema = lookInputSchema.partial();

export type Look = z.infer<typeof lookSchema>;
export type LookInput = z.infer<typeof lookInputSchema>;
export type LookUpdate = z.infer<typeof lookUpdateSchema>;
