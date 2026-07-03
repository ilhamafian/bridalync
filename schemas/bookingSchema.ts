import { z } from "zod";

import { sessionSchema } from "@/schemas/sessionSchema";
import { paymentSchema } from "@/schemas/paymentSchema";
import { addOnSchema } from "./addOnSchema";
import { packageSchema } from "./packageSchema";

export const bookingSchema = z.object({
    user_id: z.string(),
    client_id: z.string(),
    package: packageSchema,
    sessions: z.array(sessionSchema),
    payments: z.array(paymentSchema),
    add_ons: z.array(addOnSchema),
    status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
    deposit_amount: z.number(),
    total_amount: z.number(),
    balance_due_date: z.coerce.date().optional(),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

export type Booking = z.infer<typeof bookingSchema>;