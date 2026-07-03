import z from "zod";
import { objectIdSchema } from "@/schemas/objectId";

export const clientSchema = z.object({
    _id: objectIdSchema.optional(),
    name: z.string(),
    email: z.string().email(),
    mobile: z.string().min(1).optional(),
    country_code: z.string().min(1).optional(),
});

export type Client = z.infer<typeof clientSchema>;