import { z } from "zod";

const optionalPhone = z
  .string()
  .trim()
  .max(20)
  .transform((value) => value.replace(/\D/g, "").replace(/^0+/, ""))
  .refine((digits) => digits.length === 0 || (digits.length >= 8 && digits.length <= 15), {
    message: "Enter a valid phone number",
  });

export const contactInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  country_code: z.string().trim().max(8).optional().default(""),
  mobile: optionalPhone.optional().default(""),
  message: z.string().trim().min(1, "Message is required").max(2000),
  website: z.string().max(200).optional().default(""),
});

export type ContactInput = z.infer<typeof contactInputSchema>;
