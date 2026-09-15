import { z } from "zod";

const adminEmailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.email("Invalid email address")
);

export const adminSchema = z.object({
  _id: z.unknown().optional(),
  email: adminEmailSchema,
  passwordHash: z.string().min(1),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Admin = z.infer<typeof adminSchema>;

export const adminLoginCredentialsSchema = z.object({
  email: adminEmailSchema,
  password: z.string().min(1),
});

export type AdminLoginCredentials = z.infer<typeof adminLoginCredentialsSchema>;

export const adminLoginSchema = adminLoginCredentialsSchema.extend({
  code: z
    .string()
    .regex(/^\d{6}$/, "Verification code must be 6 digits."),
});

export type AdminLogin = z.infer<typeof adminLoginSchema>;
