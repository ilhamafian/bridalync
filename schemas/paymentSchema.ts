import z from "zod";

export const paymentSchema = z.object({
    payment_amount: z.number(),
    status: z.enum(["pending", "paid", "failed", "refunded"]),
    payment_method: z.enum(["cash", "card", "bank_transfer", "other"]),
    payment_reference: z.string().optional(),
    paid_at: z.coerce.date().optional(),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

export type Payment = z.infer<typeof paymentSchema>;